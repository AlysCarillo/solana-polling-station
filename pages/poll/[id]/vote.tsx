import React, { FormEvent, useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { showToaster, TOAST_TYPE } from '../../../utils/common';
import { PollWithPubkey } from '../../../models/Poll';
import { getAccountBalance, getPollsByOwner, castVote, confirmTransaction, getAllPolls } from '../../../utils/solana';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import Head from 'next/head';
import BaseStyle from '../../../styles/Base.module.scss';
import style from '../../../styles/PollVote.module.scss';
import { DefaultProps } from '../..';

const PollVote: NextPage<DefaultProps> = (props) => {
  const [pollExtended, setPollExtended] = useState<PollWithPubkey>();
  const [selectedOption, setSelectedOption] = useState<number>();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [buttonLabel, setButtonLabel] = useState('Cast Vote');
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  const { setAccountBalance, setPollCount, setOwnerPollCount } = props;

  const { id } = router.query;

  useEffect(() => {
    setLoading(true);
    //Get all polls from GetAllPolls and store it in array
    getAllPolls(connection)
    .then((polls) => {
      //Iterate through array and find the poll with the same accountPubkey as the one in the url
      polls.forEach((poll) => {
        if (poll.poll.id === id) {
          //If found, set the pollExtended to the poll found
          setPollExtended({
            poll: poll.poll,
            accountPubkey: poll.accountPubkey,
          });
        }
      });
    }).catch((err) => {
      console.log('error fetching poll data for id: ', id);
      showToaster('Error fetching poll data', TOAST_TYPE.ERROR);
    })
    .finally(() => {
      setLoading(false);
      setPageLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (setAccountBalance && setPollCount && setOwnerPollCount) {
      if (publicKey) {
        getAccountBalance(connection, publicKey).then((bal) => {
          setAccountBalance(bal);
        });
        getPollsByOwner(connection, publicKey.toBase58())
        .then((polls) => {
          setOwnerPollCount(polls.length);
        })
        .catch((err) => {
          console.error('Error fetching polls:', err);
        });
      }

      getAllPolls(connection).then((polls) => {
        setPollCount(polls.length);
      });
    }
  }, [publicKey]);

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) {
      showToaster('No option selected', TOAST_TYPE.ERROR);
      return false;
    }

    if (!publicKey) {
      showToaster('No wallet connected', TOAST_TYPE.ERROR);
      return false;
    }

    if (!pollExtended) {
      showToaster('No poll found', TOAST_TYPE.ERROR);
      return false;
    }

    let option = pollExtended.poll.options[selectedOption - 1];
    if (option) {
      setLoading(true);
      setButtonLabel('Creating transaction');
      castVote(
        connection,
        publicKey,
        pollExtended.accountPubkey,
        sendTransaction,
        option
      )
        .then((txnId) => {
          setButtonLabel('Confirming transaction');
          confirmTransaction(connection, txnId)
            .then((res) => {
              router.push(`/poll/${pollExtended.poll.id}`);
            })
            .catch((err) => {
              showToaster('Error confirming transaction', TOAST_TYPE.ERROR);
              console.log('error confirming transaction: ', err);
            })
            .finally(() => {
              setLoading(false);
              setButtonLabel('Cast Vote');
            });
        })
        .catch((err) => {
          setButtonLabel('Cast Vote');
          console.log('error creating transaction: ', err);
          showToaster('Error casting vote', TOAST_TYPE.ERROR);
          setLoading(false);
        });
    }
  };

  return (
    <>
      <Head>
        <title>Cast Vote</title>
      </Head>
      <div className={BaseStyle['child-content']}>
        <h1 className={`${BaseStyle['heading']} ${BaseStyle['main-heading']}`}>
          Cast Vote
        </h1>
        <div className={style['results']}>
          {pageLoading ? (
            <Loader />
          ) : !pollExtended ? (
            <>
              <h3>No poll found for supplied id</h3>
            </>
          ) : (
            <>
              <h2 className={style['question']}>
                Q) {pollExtended?.poll.question}
              </h2>
              <form
                name='votes'
                className={style['form']}
                onSubmit={submitForm}
              >
                <div className={style['options']}>
                  {pollExtended?.poll?.options.map((option, idx) => {
                    idx += 1;
                    return (
                      <span className={style['option']} key={`option-${idx}`}>
                        <input
                          type={'radio'}
                          id={idx.toString()}
                          name='vote_option'
                          value={idx}
                          key={`input-${idx}`}
                          onChange={() => setSelectedOption(idx)}
                        />
                        <label key={`label-${idx}`} htmlFor={idx.toString()}>
                          {option}
                        </label>
                      </span>
                    );
                  })}
                </div>
                <Button
                  design={'primary'}
                  type={'submit'}
                  className={`${style['vote-button']} ${loading ? style['loading'] : ''}`}
                  label={buttonLabel}
                  labelWithLoader
                  loading={loading}
                />
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PollVote;
