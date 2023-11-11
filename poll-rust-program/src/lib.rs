use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction::create_account,
    sysvar::Sysvar,
};

use thiserror::Error;

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Poll {
    pub wallet_publickey: String,
    pub owner: String,
    pub id: String,
    pub question: String,
    pub options: Vec<String>,
    pub votes: Vec<u32>,
    pub seed_bump: u8,
    pub timestamp: String,
}

impl Poll {
    fn new(
        wallet_publickey: String,
        owner: String,
        id: String,
        question: String,
        options: Vec<String>,
        seed_bump: u8,
    ) -> Result<Poll, SolanaPollError> {
        if wallet_publickey == "" {
            return Err(SolanaPollError::PropertyNotFound(
                "Wallet Public Key".to_string(),
            ));
        }
        if owner == "" {
            return Err(SolanaPollError::PropertyNotFound("Owner".to_string()));
        }

        if id == "" {
            return Err(SolanaPollError::PropertyNotFound("Id".to_string()));
        }

        if question == "" {
            return Err(SolanaPollError::PropertyNotFound("Question".to_string()));
        }

        if options.len() == 0 {
            return Err(SolanaPollError::NoOptionsProvided);
        }

        let options_count = options.len();
        let timestamp = match Clock::get() {
            Ok(ck) => ck.unix_timestamp.to_string(),
            Err(_) => "0000000000".to_string(),
        };
        Ok(Poll {
            wallet_publickey: wallet_publickey,
            id: id,
            owner: owner,
            question: question,
            options: options,
            votes: vec![0; options_count],
            seed_bump: seed_bump,
            timestamp,
        })
    }

    fn cast_vote(&mut self, option: &String) -> Result<(), SolanaPollError> {
        if let Some(idx) = self.options.iter().position(|x| x == option) {
            self.votes[idx] += 1;
            return Ok(());
        } else {
            return Err(SolanaPollError::InvalidInputOption);
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CastVote {
    pub option: String,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Instruction {
    pub action: u8,
    pub data: Vec<u8>,
    pub space: u64,
    pub lamports: u64,
}

#[derive(Error, Debug)]
pub enum SolanaPollError {
    #[error("{0} not found")]
    PropertyNotFound(String),

    #[error("No options provided")]
    NoOptionsProvided,

    #[error("Invalid input option")]
    InvalidInputOption,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    match Instruction::try_from_slice(instruction_data) {
        Ok(instruction) => {
            let account_iter = &mut accounts.iter();
            let payer_account = next_account_info(account_iter)?;
            let poll_account = next_account_info(account_iter)?;
            match instruction.action {
                0 => {
                    // create new account and add poll data to it
                    match Poll::try_from_slice(&instruction.data) {
                        Ok(poll) => {
                            let seed = poll.id.clone();
                            let instruction = create_account(
                                payer_account.key,
                                poll_account.key,
                                instruction.lamports,
                                instruction.space,
                                program_id,
                            );

                            match invoke_signed(
                                &instruction,
                                accounts,
                                &[&[seed.as_str().as_bytes(), &[poll.seed_bump]]],
                            ) {
                                Ok(()) => {
                                    let new_poll = match Poll::new(
                                        poll.wallet_publickey,
                                        poll.owner,
                                        poll.id,
                                        poll.question,
                                        poll.options,
                                        poll.seed_bump,
                                    ) {
                                        Ok(poll) => poll,
                                        Err(err) => {
                                            msg!(
                                                "Error while creating new poll instance: {}",
                                                err.to_string()
                                            );
                                            return Err(ProgramError::InvalidAccountData);
                                        }
                                    };
                                    match new_poll
                                        .serialize(&mut &mut poll_account.data.borrow_mut()[..])
                                    {
                                        Ok(_) => {
                                            msg!("data written to account successfully!");
                                        }
                                        Err(err) => {
                                            msg!("Error serializing new poll data: {:?}", err);
                                            return Err(ProgramError::InvalidAccountData);
                                        }
                                    }
                                }
                                Err(e) => {
                                    msg!("Error creating PDA: {:?}", e);
                                    return Err(ProgramError::InvalidAccountData);
                                }
                            }
                        }
                        Err(e) => {
                            msg!("Error deserializing Instruction poll data: {:?}", e);
                            return Err(ProgramError::InvalidInstructionData);
                        }
                    }
                }
                1 => {
                    // cast vote
                    // verify poll_account is owned by program
                    if poll_account.owner != program_id {
                        msg!("{}", ProgramError::IncorrectProgramId);
                        return Err(ProgramError::IncorrectProgramId);
                    }
                    match CastVote::try_from_slice(&instruction.data) {
                        Ok(cv) => {
                            let account_iter = &mut accounts.iter();
                            let _payer_account = next_account_info(account_iter)?;
                            let account = next_account_info(account_iter)?;
                            let mut poll = match Poll::try_from_slice(&account.data.borrow()) {
                                Ok(poll) => poll,
                                Err(err) => {
                                    msg!("{}: {:?}", ProgramError::InvalidAccountData, err);
                                    return Err(ProgramError::InvalidAccountData);
                                }
                            };

                            match poll.cast_vote(&cv.option) {
                                Ok(_) => {}
                                Err(err) => {
                                    msg!("Error casting vote: {}", err.to_string());
                                    return Err(ProgramError::InvalidAccountData);
                                }
                            }
                            match poll.serialize(&mut &mut account.data.borrow_mut()[..]) {
                                Ok(_) => {
                                    msg!("Vote casted successfully!");
                                }
                                Err(err) => {
                                    msg!("Error serializing vote data: {:?}", err);
                                    return Err(ProgramError::InvalidAccountData);
                                }
                            }
                        }
                        Err(e) => {
                            msg!("unable to deserialize new poll data: {:?}", e);
                            return Err(ProgramError::InvalidInstructionData);
                        }
                    }
                }

                _ => {
                    msg!("Invalid input Instruction action");
                    return Err(ProgramError::InvalidInstructionData);
                }
            }
        }
        Err(e) => {
            msg!("unable to deserialize Instruction data: {}", e);
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    Ok(())
}
