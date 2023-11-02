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
        owner: String,
        id: String,
        question: String,
        options: Vec<String>,
        seed_bump: u8,
    ) -> Result<Poll, BlockPollError> {
        if owner == "" {
            return Err(BlockPollError::PropertyNotFound("Owner".to_string()));
        }

        if id == "" {
            return Err(BlockPollError::PropertyNotFound("Id".to_string()));
        }

        if question == "" {
            return Err(BlockPollError::PropertyNotFound("Question".to_string()));
        }

        if options.len() == 0 {
            return Err(BlockPollError::NoOptionsProvided);
        }

        let options_count = options.len();
        let timestamp = match Clock::get() {
            Ok(ck) => ck.unix_timestamp.to_string(),
            Err(_) => "0000000000".to_string(),
        };
        Ok(Poll {
            id: id,
            owner: owner,
            question: question,
            options: options,
            votes: vec![0; options_count],
            seed_bump: seed_bump,
            timestamp,
        })
    }

    fn cast_vote(&mut self, option: &String) -> Result<(), BlockPollError> {
        if let Some(idx) = self.options.iter().position(|x| x == option) {
            self.votes[idx] += 1;
            return Ok(());
        } else {
            return Err(BlockPollError::InvalidInputOption);
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
pub enum BlockPollError {
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

#[cfg(test)]
mod tests {
    use crate::{process_instruction, BlockPollError, CastVote, Instruction, Poll};
    use borsh::{BorshDeserialize, BorshSerialize};
    use solana_program::{
        account_info::AccountInfo, clock::Epoch, program_error::ProgramError, pubkey::Pubkey,
    };

    #[test]
    fn success_new_poll() {
        let question = String::from("What is your favorite color?");
        let options = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let owner = "poll_owner".to_string();
        let id = "1".to_string();
        let seed_bump = 255;

        let expected_poll = match Poll::new(owner, id, question, options, seed_bump) {
            Ok(poll) => poll,
            Err(err) => {
                panic!("unexpected error: {:?}", err);
            }
        };

        assert_eq!(expected_poll.id, "1".to_string());
    }

    #[test]
    fn new_poll_missing_params() {
        let question = String::from("What is your favorite color?");
        let options = vec!["Red".to_string(), "Blue".to_string(), "Green".to_string()];
        let id = "1".to_string();
        let seed_bump = 255;
        let owner = "poll_owner".to_string();

        // Missing owner
        match Poll::new(
            "".to_string(),
            id.clone(),
            question.clone(),
            options.clone(),
            seed_bump,
        ) {
            Ok(_) => panic!("Unexpected output!"),
            Err(err) => {
                assert_eq!(
                    err.to_string(),
                    BlockPollError::PropertyNotFound("Owner".to_string()).to_string()
                );
            }
        };

        // Missing id
        match Poll::new(
            owner.to_string(),
            "".to_string(),
            question.clone(),
            options.clone(),
            seed_bump,
        ) {
            Ok(_) => panic!("Unexpected output!"),
            Err(err) => {
                assert_eq!(
                    err.to_string(),
                    BlockPollError::PropertyNotFound("Id".to_string()).to_string()
                );
            }
        };

        // Missing question
        match Poll::new(
            owner.clone(),
            id.clone(),
            "".to_string(),
            options.clone(),
            seed_bump,
        ) {
            Ok(_) => panic!("Unexpected output!"),
            Err(err) => {
                assert_eq!(
                    err.to_string(),
                    BlockPollError::PropertyNotFound("Question".to_string()).to_string()
                );
            }
        };

        // Missing options
        match Poll::new(
            owner.clone(),
            id.clone(),
            question.clone(),
            vec![],
            seed_bump,
        ) {
            Ok(_) => panic!("Unexpected output!"),
            Err(err) => {
                assert_eq!(
                    err.to_string(),
                    BlockPollError::NoOptionsProvided.to_string()
                );
                return;
            }
        };
    }

    #[test]
    fn invalid_instruction() {
        let payer_key = Pubkey::default();
        let poll_key = Pubkey::default();
        let program_id = Pubkey::default();

        let mut payer_lamports: u64 = 0;
        let mut poll_lamports: u64 = 0;

        let mut payer_data: Vec<u8> = Vec::new();
        let mut poll_data = payer_data.clone();

        let instruction_invalid: Instruction = Instruction {
            action: 10, // Invalid action
            data: vec![],
            lamports: 0,
            space: 0,
        };

        let instruction_invalid_serialized = instruction_invalid.try_to_vec().unwrap();

        let payer_account = AccountInfo::new(
            &payer_key,
            true,
            true,
            &mut payer_lamports,
            &mut payer_data[..],
            &program_id,
            false,
            Epoch::default(),
        );

        let poll_account = AccountInfo::new(
            &poll_key,
            false,
            true,
            &mut poll_lamports,
            &mut poll_data[..],
            &program_id,
            false,
            Epoch::default(),
        );

        let accounts = &[payer_account, poll_account];

        match process_instruction(&program_id, accounts, &instruction_invalid_serialized) {
            Ok(_) => panic!("Unexpected output!"),

            Err(e) => {
                assert_eq!(
                    ProgramError::InvalidInstructionData.to_string(),
                    e.to_string()
                )
            }
        }
    }

    #[test]
    fn create_poll_cast_vote() {
        let payer_key = Pubkey::default();
        let program_id = Pubkey::default();
        let mut payer_data: Vec<u8> = Vec::new();
        let question = "What is your favourite TV show?".to_string();
        let options = vec![
            "FRIENDS".to_string(),
            "Mr. Robot".to_string(),
            "The Mentalist".to_string(),
        ];
        let poll_id = "1".to_string();
        let poll_owner = "anonymous".to_string();

        let mut payer_lamports: u64 = 0;
        let mut poll_lamports: u64 = 0;

        let mut poll: Poll = Poll::new(poll_owner, poll_id, question, options, 0).unwrap();

        let (poll_key, seed_bump) =
            Pubkey::find_program_address(&[poll.id.as_bytes()], &program_id);

        poll.seed_bump = seed_bump;

        let poll_serialized = poll.try_to_vec().unwrap();
        let poll_serialized_space = poll_serialized.clone().len() as u64;
        let mut poll_account_data: Vec<u8> = vec![0; poll_serialized_space.try_into().unwrap()];

        let instruction: Instruction = Instruction {
            action: 0,
            data: poll_serialized.clone(),
            lamports: 0,
            space: poll_serialized_space,
        };

        let instruction_serialized = instruction.try_to_vec().unwrap();

        let payer_account = AccountInfo::new(
            &payer_key,
            true,
            true,
            &mut payer_lamports,
            &mut payer_data[..],
            &program_id,
            false,
            Epoch::default(),
        );

        let poll_account = AccountInfo::new(
            &poll_key,
            false,
            true,
            &mut poll_lamports,
            &mut poll_account_data[..],
            &program_id,
            false,
            Epoch::default(),
        );

        let accounts = &[payer_account, poll_account];

        match process_instruction(&program_id, accounts, &instruction_serialized) {
            Ok(()) => {
                println!("Poll created successfully!");
                let poll = Poll::try_from_slice(&accounts[1].data.borrow()).unwrap();
                assert_eq!(poll.id, "1".to_string());

                // Cast vote
                let vote = CastVote {
                    option: "FRIENDS".to_string(),
                };

                let vote_serialized = vote.try_to_vec().unwrap();

                let vote_instruction = Instruction {
                    action: 1,
                    data: vote_serialized,
                    lamports: 0,
                    space: 0,
                };

                let vote_instruction_serialized = vote_instruction.try_to_vec().unwrap();

                match process_instruction(&program_id, accounts, &vote_instruction_serialized) {
                    Ok(()) => {
                        let poll = Poll::try_from_slice(&accounts[1].data.borrow()).unwrap();
                        assert_eq!(poll.votes[0], 1);
                    }
                    Err(err) => {
                        panic!("Unexpected error: {}", err);
                    }
                }
            }
            Err(e) => {
                panic!("Unexpected error: {}", e);
            }
        }
    }
}
