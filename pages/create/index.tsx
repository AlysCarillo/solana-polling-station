import style from '../../styles/CreatePoll.module.scss';
import BaseStyle from '../../styles/Base.module.scss';
import { NextPage } from 'next';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useMemo, useEffect, FormEvent } from 'react';
import { FaPlus, FaStarOfLife } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { showToaster, TOAST_TYPE } from '../../utils/common';
import {
  confirmTransaction,
  createPoll,
  getAccountBalance,
  getPollsCount,
} from '../../utils/solana';
import Button from '../../components/Button';
import { DefaultProps } from '..';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CreatePoll: NextPage<DefaultProps> = (props) => {
  const router = useRouter();
  const [optionsRowState, setOptionsRowState] = useState<JSX.Element[]>([]);
  const [triggerChange, setTriggerChange] = useState<boolean>(false);
  const { setAccountBalance, setPollCount, pollCount, accountBalance } = props;
  const [loading, setLoading] = useState<boolean>(false);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [buttonLabel, setButtonLabel] = useState('Create');
  let optionRows = useMemo<JSX.Element[]>(() => [], []);

  const deleteOption = useMemo(
    () => (rowKey: string) => {
      let idx = optionRows.findIndex((x) => x.key == rowKey);
      if (idx > -1) {
        optionRows.splice(idx, 1);
        setTriggerChange(true);
      }
    },
    [optionRows]
  );

  const newOption = useMemo(
    () => (required: boolean, count?: number) => {
      if (count === undefined) {
        count = optionRows.length;
      }

      let rowKey = `option-row-${count}`;

      while (optionRows.findIndex((x) => x.key === rowKey) > -1) {
        count += 1;
        rowKey = `option-row-${count}`;
      }

      let row = (
        <tr key={rowKey}>
          <td style={{ textAlign: 'center' }}>
            <FaStarOfLife className={style['fa-star']} />
          </td>
          <td>
            <input
              required={required}
              className={`${BaseStyle['input']} ${style['options-table-input']}`}
              type={'text'}
              placeholder={`Enter Option ${required ? '(Required)' : ''}`}
              autoFocus={!required}
              key={`option-input-${count}`}
              id={`input-${count}`}
            />
          </td>

          {!required ? (
            <td style={{ textAlign: 'center' }}>
              <MdDelete
                key={`option-delete-${count}`}
                onClick={(e) => {
                  e.preventDefault();
                  deleteOption(rowKey);
                }}
                className={`${BaseStyle['fa-button']}`}
              />
            </td>
          ) : (
            <></>
          )}
        </tr>
      );

      return row;
    },
    [deleteOption, optionRows]
  );

  useEffect(() => {
    optionRows.push(newOption(true, 0));
    optionRows.push(newOption(true, 1));
  }, []);

  useEffect(() => {
    if (publicKey && setAccountBalance && setPollCount) {
      getAccountBalance(connection, publicKey).then((bal) => {
        setAccountBalance(bal);
      });

      getPollsCount(connection, 'anonymous').then((count) => {
        setPollCount(count);
      });
    }
  }, [publicKey]);

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let question: string = (event.target as any)['question'].value;
    let options: string[] = [];
    if (!question) {
      showToaster('No question provided!', TOAST_TYPE.ERROR);
      return false;
    }

    optionRows.map((x) => {
      let id = (x.key as string).split('-')[2];
      let opt = (event.target as any)[`input-${id}`].value;
      if (opt) options.push(opt);
    });

    if (options.length == 0) {
      showToaster('No option provided!', TOAST_TYPE.ERROR);
      return false;
    }

    if (publicKey) {
      setLoading(true);
      setButtonLabel('Creating transaction');
      createPoll(
        connection,
        publicKey,
        question,
        options,
        'anonymous',
        sendTransaction
      )
        .then((result) => {
          let txnId = result[0];
          let newPollId = result[1];
          setButtonLabel('Confirming transaction');
          confirmTransaction(connection, txnId)
            .then(() => {
              showToaster('Poll created!', TOAST_TYPE.SUCCESS);
              router.push(`/poll/${newPollId}`);
            })
            .catch((err) => {
              showToaster(
                `Error confirming transaction ${txnId}`,
                TOAST_TYPE.ERROR
              );
              console.log(`error confirming transaction ${txnId}: `, err);
            })
            .finally(() => {
              setButtonLabel('Create');
              setLoading(false);
            });
        })
        .catch((err) => {
          showToaster('Error creating poll', TOAST_TYPE.ERROR);
          console.log('an error occured while creating poll: ', err);
          setButtonLabel('Create');
          setLoading(false);
        });
    } else {
      showToaster('No wallet connected!', TOAST_TYPE.ERROR);
      return false;
    }
  };

  useEffect(() => {
    setOptionsRowState(optionRows);
    return function cleanup() {
      setTriggerChange(false);
    };
  }, [optionRows, triggerChange]);

  return (
    <>
      <Head>
        <title>Create Poll | BlockPoll</title>
      </Head>
      <div className={BaseStyle['child-content']}>
        <h1 className={`${BaseStyle['heading']} ${style['main-heading']}`}>
          Create Poll
        </h1>
        <form
          onSubmit={submitForm}
          id='pollform'
          className={style['poll-form']}
        >
          <input
            required
            className={`${BaseStyle['input']}`}
            type={'text'}
            placeholder='Enter Question (Required)'
            id='question'
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              optionRows.push(newOption(false));
              setTriggerChange(true);
            }}
            className={`${style['add-option-button']} ${BaseStyle['secondary-button']}`}
            type={'button'}
          >
            {' '}
            <FaPlus /> Option{' '}
          </button>
          <span className={style['options']}>
            <table className={style['options-table']}>
              <tbody>{optionsRowState.map((x) => x)}</tbody>
            </table>
          </span>

          <span className={style['create-button']}>
            <Button
              type={'submit'}
              design={'primary'}
              label={buttonLabel}
              loading={loading}
              className={style['poll-button']}
              labelWithLoader
            />
          </span>
        </form>
      </div>
    </>
  );
};

export default CreatePoll;
