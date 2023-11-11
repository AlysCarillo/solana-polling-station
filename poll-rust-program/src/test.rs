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

#[cfg(test)]
mod tests {
    use crate::{process_instruction, CastVote, Instruction, Poll, SolanaPollError};
    use borsh::{BorshDeserialize, BorshSerialize};
    use solana_program::{
        account_info::AccountInfo, clock::Epoch, program_error::ProgramError, pubkey::Pubkey,
    };

    #[test]
    fn success_new_poll() {
        let wallet_publickey = "wallet_publickey".to_string();
        let question = String::from("What is your favorite color?");
        let options = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let owner = "poll_owner".to_string();
        let id = "1".to_string();
        let seed_bump = 255;

        let expected_poll =
            match Poll::new(wallet_publickey, owner, id, question, options, seed_bump) {
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
        let wallet_publickey = "wallet_publickey".to_string();

        // Missing wallet_publickey
        match Poll::new(
            "".to_string(),
            owner.clone(),
            id.clone(),
            question.clone(),
            options.clone(),
            seed_bump,
        ) {
            Ok(_) => panic!("Unexpected output!"),
            Err(err) => {
                assert_eq!(
                    err.to_string(),
                    SolanaPollError::PropertyNotFound("Wallet Public Key".to_string()).to_string()
                );
            }
        };

        // Missing owner
        match Poll::new(
            "".to_string(),
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
                    SolanaPollError::PropertyNotFound("Owner".to_string()).to_string()
                );
            }
        };

        // Missing id
        match Poll::new(
            wallet_publickey.to_string(),
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
                    SolanaPollError::PropertyNotFound("Id".to_string()).to_string()
                );
            }
        };

        // Missing question
        match Poll::new(
            wallet_publickey.clone(),
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
                    SolanaPollError::PropertyNotFound("Question".to_string()).to_string()
                );
            }
        };

        // Missing options
        match Poll::new(
            wallet_publickey.clone(),
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
                    SolanaPollError::NoOptionsProvided.to_string()
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
        let poll_wallet_publickey = "wallet_publickey".to_string();

        let mut payer_lamports: u64 = 0;
        let mut poll_lamports: u64 = 0;

        let mut poll: Poll = Poll::new(
            poll_wallet_publickey,
            poll_owner,
            poll_id,
            question,
            options,
            0,
        )
        .unwrap();

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
