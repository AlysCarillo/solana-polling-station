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
  getPollById,
  getPollsCount,
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

const PollResult: NextPage<DefaultProps> = (props) => {
  const host = props.host ? props.host : '';
  console.log('poll result - host: ', host);
  const router = useRouter();
  const [refresh, setRefresh] = useState<boolean>(false);
  const [pollExtended, setPollExtended] = useState<PollWithPubkey>();
  const { connection } = useConnection();
  const [pollUrl, setPollUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { publicKey } = useWallet();
  const { setPollCount, setAccountBalance } = props;
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      let pollId = Array.isArray(id) ? id[0] : id;
      setLoading(true);
      getPollById(connection, pollId)
        .then((poll) => {
          if (poll) {
            setPollExtended(poll);
            setPollUrl(`${host}/poll/${poll.poll.id}/vote`);
          }
        })
        .catch((err) => {
          showToaster('An error occured fetching poll data!', TOAST_TYPE.ERROR);
          console.log('An error occured fetching poll data: ', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [publicKey, refresh, id]);

  useEffect(() => {
    if (setAccountBalance && setPollCount) {
      if (publicKey) {
        getAccountBalance(connection, publicKey).then((bal) => {
          setAccountBalance(bal);
        });
      }

      getPollsCount(connection, 'anonymous').then((count) => {
        setPollCount(count);
      });
    }
  }, [publicKey, refresh, id]);

  Chart.register();
  return (
    <>
      <Head>
        <title>Poll Results | BlockPoll</title>
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
              Q) {pollExtended.poll.question}{' '}
            </h2>

            <Bar
              className={style['poll-chart']}
              data={getGraphData(pollExtended.poll)}
              options={{
                aspectRatio: 3,
                maintainAspectRatio: true,
                indexAxis: 'y',
                responsive: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                  },
                },
                scales: {
                  linear: {
                    axis: 'y',
                    grid: {
                      display: false,
                    },
                    ticks: {
                      stepSize: 1,
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
};

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
