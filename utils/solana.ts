import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { deserialize, serialize } from 'borsh';
import base58 from 'bs58';
import { BlockPollInstruction, InstructionSchema } from '../models/Instruction';
import {
  Poll,
  PollWithPubkey,
  PollSchema,
  Vote,
  VoteSchema,
} from '../models/Poll';
import {
  SearchById,
  SearchByIdSchema,
  SearchByOwner,
  SearchByOwnerSchema,
} from '../models/Search';
import { generateId } from './common';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID
  ? process.env.NEXT_PUBLIC_PROGRAM_ID
  : '';
const ProgramId = new PublicKey(PROGRAM_ID);

const getProgramId = (): PublicKey => ProgramId;

const getPollsByOwner = async (
  connection: Connection,
  owner: string
): Promise<PollWithPubkey[]> => {
  let polls: PollWithPubkey[] = [];

  const ProgramId = getProgramId();
  let SBO = new SearchByOwner({ owner: owner });
  let searchByOwnerSerialized = serialize(SearchByOwnerSchema, SBO);

  const accounts = await connection.getParsedProgramAccounts(ProgramId, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: base58.encode(searchByOwnerSerialized),
        },
      },
    ],
    commitment: 'confirmed',
  });
  accounts.forEach((account) => {
    if (account.account.owner.toBase58() != ProgramId.toBase58()) {
      throw new Error(
        'Invalid account found. Account owner does not match program Id'
      );
    }

    try {
      let poll = deserialize(PollSchema, Poll, account.account.data as Buffer);
      polls.push({ poll: poll, accountPubkey: account.pubkey });
    } catch (err) {
      console.log('error occured while deserializing poll data: ', err);
    }
  });

  polls.sort((a, b) => Number(b?.poll.timestamp) - Number(a?.poll.timestamp));

  return polls;
};

const getPollById = async (
  connection: Connection,
  id: string
): Promise<PollWithPubkey | null> => {
  let programId = getProgramId();

  let SBI = new SearchById({ id: id });
  let searchByIdSerialized = serialize(SearchByIdSchema, SBI);

  const accounts = await connection.getParsedProgramAccounts(programId, {
    filters: [
      {
        memcmp: {
          offset: 13,
          bytes: base58.encode(searchByIdSerialized),
        },
      },
    ],
    commitment: 'confirmed',
  });

  if (accounts.length > 0) {
    let account = accounts[0];
    let poll = deserialize(PollSchema, Poll, account.account.data as Buffer);
    let pollExtended: PollWithPubkey = {
      accountPubkey: account.pubkey,
      poll: poll,
    };
    return pollExtended;
  }

  return null;
};

const getPollsCount = async (
  connection: Connection,
  owner: string
): Promise<number> => {
  let programId = getProgramId();
  let SBO = new SearchByOwner({ owner: owner });
  let serialized = serialize(SearchByOwnerSchema, SBO);

  const accounts = await connection.getProgramAccounts(programId, {
    commitment: 'confirmed',
    dataSlice: { length: 0, offset: 0 },
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: base58.encode(serialized),
        },
      },
    ],
  });

  return accounts.length;
};

const getAccountBalance = async (
  connection: Connection,
  pubkey: PublicKey
): Promise<number> => {
  let balance = 0;

  balance = await connection.getBalance(pubkey, 'confirmed');
  balance = convertLamportsToSOL(balance);
  return balance;
};

const castVote = async (
  connection: Connection,
  walletPubkey: PublicKey,
  pollPubkey: PublicKey,
  sendTransaction: WalletContextState['sendTransaction'],
  option: string
): Promise<string> => {
  let programId = getProgramId();
  let vote = new Vote({ option: option });
  let voteSerialized = serialize(VoteSchema, vote);

  let bpInstruction = new BlockPollInstruction({
    action: 1,
    data: voteSerialized,
    lamports: 0,
    space: 0,
  });

  let bpSerialized = serialize(InstructionSchema, bpInstruction);

  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: walletPubkey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: pollPubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.from(bpSerialized),
  });

  const transaction = new Transaction().add(instruction);

  let txnId = await sendTransaction(transaction, connection);
  return txnId;
};

const createPoll = async (
  connection: Connection,
  walletPubkey: PublicKey,
  question: string,
  options: string[],
  owner: string,
  sendTransaction: WalletContextState['sendTransaction']
): Promise<string[]> => {
  try {
    const ProgramId = getProgramId();
    const id = generateId(7);

    let poll = new Poll({
      id: id,
      options: options,
      owner: owner,
      question: question,
      votes: new Array(options.length).fill(0),
      seed_bump: 0,
      timestamp: '0000000000',
    });

    let [pollPubKey, seedBump] = await PublicKey.findProgramAddress(
      [Buffer.from(id)],
      ProgramId
    );

    poll.seed_bump = seedBump;

    //1. Serialize poll data
    let serializedPollData = serialize(PollSchema, poll);

    //2. Find min balance and space required to store poll data
    let dataLength = serializedPollData.length;
    let minBalance = await connection.getMinimumBalanceForRentExemption(
      dataLength
    );

    //2. Create BlockPoll Instruction data

    let bpInstruction = new BlockPollInstruction({
      action: 0,
      data: serializedPollData,
      lamports: minBalance,
      space: dataLength,
    });

    let bpSerialized = serialize(InstructionSchema, bpInstruction);

    const instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: walletPubkey,
          isSigner: true,
          isWritable: true,
        },
        { pubkey: pollPubKey, isSigner: false, isWritable: true },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: ProgramId,
      data: Buffer.from(bpSerialized),
    });

    const transaction = new Transaction().add(instruction);

    let txnId = await sendTransaction(transaction, connection, {
      preflightCommitment: 'confirmed',
    });

    return [txnId, id];
  } catch (err) {
    throw new Error(`Unable to create poll: ${err}`);
  }
};

const confirmTransaction = async (connection: Connection, txnId: string) => {
  try {
    let result = await connection.confirmTransaction(txnId, 'confirmed');
    return result;
  } catch (err) {
    throw new Error(`Error confirming transaction: ${err}`);
  }
};

const requestAirdrop = async (
  connection: Connection,
  pubkey: PublicKey,
  lamports = LAMPORTS_PER_SOL
): Promise<string> => {
  try {
    let txnId = await connection.requestAirdrop(pubkey, lamports);
    return txnId;
  } catch (err) {
    throw new Error(`Error requesting airdrop: ${err}`);
  }
};

const convertLamportsToSOL = (lamports: number): number => {
  let sol = 0;
  if (lamports > 0) {
    sol = lamports / LAMPORTS_PER_SOL;
  }
  return sol;
};

export {
  getPollsByOwner,
  getPollById,
  getAccountBalance,
  castVote,
  getProgramId,
  createPoll,
  confirmTransaction,
  getPollsCount,
  requestAirdrop,
  convertLamportsToSOL,
};
