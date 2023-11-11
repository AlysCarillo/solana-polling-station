import { GetServerSideProps, NextPage } from 'next';
import { Poll, PollWithPubkey } from '../../../models/Poll';

import style from '../../../styles/PollResult.module.scss';
import BaseStyle from '../../../styles/Base.module.scss';
import { Bar } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import { MdRefresh } from 'react-icons/md';
import { useEffect, useState } from 'react';
import {
  getAccountBalance,
  getPollsByOwner,
  getAllPolls,
} from '../../../utils/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  copyToClipboard,
  showToaster,
  TOAST_TYPE,
} from '../../../utils/common';
import Loader from '../../../components/Loader';
import { useRouter } from 'next/router';
import { DefaultProps } from '../..';
import Button from '../../../components/Button';
import Head from 'next/head';
import { PublicKey } from '@solana/web3.js';
import { get } from 'http';

const PollResult: NextPage<DefaultProps> = (props) => {
  const host = props.host ? props.host : '';
  const router = useRouter();
  const [refresh, setRefresh] = useState<boolean>(false);
  const [pollExtended, setPollExtended] = useState<PollWithPubkey>();
  const { connection } = useConnection();
  const [pollUrl, setPollUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { publicKey } = useWallet();
  const { setPollCount, setAccountBalance, setOwnerPollCount } = props;
  const { id } = router.query;

  useEffect(() => {
    setLoading(true);
    //Get all polls and store it in array
    getAllPolls(connection)
    .then((polls) => {
      //Iterate through array and find the poll with the same id 
      polls.forEach((poll) => {
        if (poll.poll.id === id) {
          //If found, set the pollExtended to the poll found
          setPollExtended(poll);
          //Set the pollUrl to the url of the poll
          setPollUrl(`${host}/poll/${id}/vote`);
          //Set loading to false
          setLoading(false);
        }
      });
      setLoading(false);
    }).finally(() => {
      setLoading(false);
    });
  }, [publicKey, refresh]);

  useEffect(() => {
    if (setAccountBalance && setPollCount && setOwnerPollCount) {
      if (publicKey) {
        getAccountBalance(connection, publicKey).then((bal) => {
          setAccountBalance(bal);
        });

        getAllPolls(connection).then((polls) => {
          setPollCount(polls.length);
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
  }, [publicKey, refresh, id]);

  Chart.register();
  return (
    <>
      <Head>
        <title>Poll Results</title>
      </Head>
      <div className={BaseStyle['child-content']}>
        <h1
          className={`${BaseStyle['heading']} ${BaseStyle['main-heading']} ${style['poll-heading']}`}
        >
          <span className={style['poll-result-label']}>
            Poll Results{' '}
            <MdRefresh
              className={`${BaseStyle['fa-button']} ${style['fa-refresh']}`}
              onClick={() => {
                setRefresh(!refresh);
              }}
            />
          </span>
        </h1>
  
        {loading ? (
          <Loader />
        ) : !pollExtended?.poll.question ? (
          <div className={style['results']}>
            <h3>No poll found for supplied id</h3>
          </div>
        ) : (
          <div className={style['results']}>
            <h2 className={style['question']}>
              Q) {pollExtended!.poll.question}{' '}
            </h2>
  
            <Bar
              className={style['poll-chart']}
              data={getGraphData(pollExtended!.poll)}
              options={{
                aspectRatio: 3,
                maintainAspectRatio: true,
                indexAxis: 'x',
                responsive: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                    labels: {
                      color: 'white', // Set the legend label color
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      color: 'white', // Set x-axis label color
                    },
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: 'white', // Set y-axis label color
                    },
                    grid: {
                      color: 'white', // Set the y-axis grid line color
                    },
                  },
                },
              }}
            />
            <div className={style['poll-url']}>
              <Button
                design={'secondary'}
                type={'button'}
                label={'Cast Vote'}
                onClick={() => router.push(pollUrl)}
              />
              <Button
                design={'secondary'}
                type={'button'}
                label={'Copy Vote URL'}
                onClick={() => {
                  copyToClipboard(pollUrl, 'Vote URL copied to clipboard');
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}  
const getGraphData = (poll: Poll) => {
  const data = {
    labels: poll.options,
    datasets: [
      {
        label: 'Number of votes',
        data: poll.votes,
        backgroundColor: ['purple'],
        borderWidth: 1,
      },
    ],
  };

  return data;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      host: `http://${context.req.headers.host}`,
    },
  };
};

export default PollResult;