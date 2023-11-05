import { PublicKey } from '@solana/web3.js';
import { Schema } from 'borsh';

export interface PollWithPubkey {
  poll: Poll;
  accountPubkey: PublicKey;
}

export class Poll {
  walletPubkey: string = '';
  owner: string = '';
  id: string = '';
  question: string = '';
  options: string[] = [];
  votes: number[] = [];
  seed_bump: number = 0;
  timestamp: string = '';

  constructor(fields?: {
    walletPubkey: string;
    owner: string;
    id: string;
    question: string;
    options: string[];
    votes: number[];
    seed_bump: number;
    timestamp: string;
  }) {
    if (fields) {
      this.walletPubkey = fields.walletPubkey;
      this.owner = fields.owner;
      this.id = fields.id;
      this.question = fields.question;
      this.options = fields.options;
      this.votes = fields.votes;
      this.seed_bump = fields.seed_bump;
      this.timestamp = fields.timestamp;
    }
  }
}

export const PollSchema: Schema = new Map([
  [
    Poll,
    {
      kind: 'struct',
      fields: [
        ['walletPubkey', 'string'], // Include the new property
        ['owner', 'string'],
        ['id', 'string'],
        ['question', 'string'],
        ['options', ['string']],
        ['votes', ['u32']],
        ['seed_bump', 'u8'],
        ['timestamp', 'string'],
      ],
    },
  ],
]);

export class PollInput {
  walletPubkey: string = '';
  owner: string = '';
  id: string = '';
  question: string = '';
  options: string[] = [];
  seedBump: number = 0;

  constructor(fields?: {
    walletPubkey: string;
    owner: string;
    id: string;
    question: string;
    options: string[];
    seedBump: number;
  }) {
    if (fields) {
      this.walletPubkey = fields.walletPubkey;
      this.owner = fields.owner;
      this.id = fields.id;
      this.question = fields.question;
      this.options = fields.options;
      this.seedBump = fields.seedBump;
    }
  }
}

export class Vote {
  option: string = '';
  constructor(fields?: { option: string }) {
    if (fields) {
      this.option = fields.option;
    }
  }
}

export const VoteSchema: Schema = new Map([
  [
    Vote,
    {
      kind: 'struct',
      fields: [['option', 'string']],
    },
  ],
]);

export interface SelectedPoll {
  id?: string;
}
