import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import ReactTooltip from 'react-tooltip';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import {
  FaExternalLinkAlt,
  FaRegCopy,
  FaPoll,
  FaShareAltSquare,
  FaArrowLeft,
  FaArrowRight,
} from 'react-icons/fa';

import { BsFillHandIndexThumbFill } from 'react-icons/bs';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { PollWithPubkey } from '../models/Poll';
import {
  convertEpochToISODate,
  copyToClipboard,
  showToaster,
  TOAST_TYPE,
  transformQuestion,
} from '../utils/common';
import { getAccountBalance, getAllPolls, getPollsByOwner } from '../utils/solana';

import style from '../styles/Home.module.scss';
import BaseStyle from '../styles/Base.module.scss';
import { useRouter } from 'next/router';
import Head from 'next/head';

export interface DefaultProps {
  setAccountBalance?: Dispatch<SetStateAction<number>>;
  setPollCount?: Dispatch<SetStateAction<number>>;
  setOwnerPollCount?: Dispatch<SetStateAction<number>>;
  pollCount?: number;
  accountBalance?: number;
  ownerPollCount?: number;
  host?: string;
}

const Home: NextPage<DefaultProps> = (props) => {
  const metaTitle =
    'Solana Polling Dapp';
  const metaDescription =
    'Decentralized blockchain-based Polling application. Create Polls, Cast Vote, View Results and more...';
  const host = props.host ? props.host : '';
  const router = useRouter();
  const [polls, setPolls] = useState<PollWithPubkey[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { setPollCount, setAccountBalance, setOwnerPollCount } = props;

  useEffect(() => {
    setLoading(true);
    getAllPolls(connection)
      .then((polls) => {
        polls.sort((a, b) => parseInt(b.poll.timestamp) - parseInt(a.poll.timestamp));
        setPolls(polls);
        setTotalPages(Math.ceil(polls.length / 5));
        if (setPollCount) {
          console.log('polls: ', polls);
          setPollCount(polls.length);
        }
      })
      .catch((err) => {
        console.log('error fetching polls: ', err);
        showToaster('Error fetching polls', TOAST_TYPE.ERROR);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  

  useEffect(() => {
    if (setAccountBalance && publicKey && setOwnerPollCount) {
      getAccountBalance(connection, publicKey).then((bal) => {
        setAccountBalance(bal);
      });

      getPollsByOwner(connection, publicKey.toBase58()).then((polls) => {
        setOwnerPollCount(polls.length);
      });
    }
  }, [publicKey, setAccountBalance, setOwnerPollCount, connection]);
  

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta
          name='description'
          content={metaDescription}
          key={'home-description'}
        />
        <meta property='og:title' content={metaTitle} key={'home-og-title'} />
        <meta
          property='og:description'
          content={metaDescription}
          key={'home-og-description'}
        />
        <meta property='og:url' content={`${host}`} key={'home-og-url'} />
        <meta
          key={'post-og-thumbnail'}
          property='og:image'
          content={`${host}/assets/images/icon.png`}
        />
      </Head>
      <div className={BaseStyle['child-content']}>
        <h1 className={`${BaseStyle['heading']} ${BaseStyle['main-heading']}`}>
          Recent Polls
        </h1>
        {loading ? (
          <Loader />
        ) : (
          <span className={style['poll-content']}>
            <table className={style['main-table']}>
              <thead>
                <tr>
                  <th className={`${style.th}`} style={{ width: '25%' }}>
                    Account Id
                  </th>
                  <th className={`${style.th}`}>Question</th>
                  <th className={`${style.th}`} style={{ width: '17%' }}>
                    Timestamp (UTC)
                  </th>
                  <th className={`${style.th}`} style={{ width: '13%' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {polls
                  .slice((pageNumber - 1) * 5, 5 * pageNumber)
                  .map((poll, i) => {
                    const snum = (pageNumber - 1) * 5 + i + 1;
                    return (
                      <tr key={'poll-snum-' + snum}>
                        <td className={`${style.td} ${style['td-account-id']}`}>
                          <Link
                            href={`https://explorer.solana.com/address/${poll.accountPubkey.toBase58()}?cluster=devnet`}
                          >
                            <a target='_blank'>
                              {poll.accountPubkey.toBase58()}{' '}
                              <FaExternalLinkAlt
                                className={style['fa-external-link']}
                              />
                            </a>
                          </Link>
                          <FaRegCopy
                            className={BaseStyle['fa-copy']}
                            onClick={async () => {
                              await copyToClipboard(
                                poll.accountPubkey.toBase58()
                              );
                            }}
                          />
                        </td>
                        <td className={style.td}>
                          {transformQuestion(poll.poll.question, 92)}
                        </td>
                        <td className={style.td}>
                          {convertEpochToISODate(poll.poll.timestamp)}
                        </td>
                        <td className={`${style.td}`}>
                          <div className={style['actions']}>
                            <FaPoll
                              className={BaseStyle['fa-button']}
                              onClick={() => {
                                router.push(`/poll/${poll.poll.id}`);
                              }}
                              title="View Poll Results"
                            />
                            <BsFillHandIndexThumbFill
                              onClick={() => {
                                router.push(`/poll/${poll.poll.id}/vote`);
                              }}
                              className={BaseStyle['fa-button']}
                              title="Cast Vote"
                            ></BsFillHandIndexThumbFill>

                            <FaShareAltSquare
                              onClick={async () => {
                                await copyToClipboard(
                                  `${host}/poll/${poll.poll.id}`,
                                  'Poll URL copied to clipboard!'
                                );
                              }}
                              className={BaseStyle['fa-button']}
                              title="Copy Poll URL"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div className={style['pager']}>
              <FaArrowLeft
                onClick={() =>
                  setPageNumber(
                    pageNumber - 1 < 1 ? totalPages : pageNumber - 1
                  )
                }
                className={BaseStyle['fa-button']}
              />
              <div className={style['pager-pages']}>
                {new Array(totalPages).fill(0).map((x, idx) => {
                  return (
                    <Button
                      onClick={() => setPageNumber(idx + 1)}
                      design={idx + 1 === pageNumber ? 'primary' : 'secondary'}
                      key={'page-' + idx}
                      label={`${idx + 1}`}
                      className={`${style['page-number']} ${idx + 1 === pageNumber ? style['current'] : ''}`}
                    ></Button>
                  );
                })}
              </div>
              <FaArrowRight
                onClick={() =>
                  setPageNumber(
                    pageNumber + 1 > totalPages ? 1 : pageNumber + 1
                  )
                }
                className={BaseStyle['fa-button']}
              />
            </div>
          </span>
        )}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      host: `http://${context.req.headers.host}`,
    },
  };
};

export default Home;
