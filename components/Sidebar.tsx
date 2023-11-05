import {
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { NextPage } from 'next';
import { FaRegCopy } from 'react-icons/fa';
import { transformSolanaId, copyToClipboard, showToaster, TOAST_TYPE } from '../utils/common';
import { convertLamportsToSOL, requestAirdrop, confirmTransaction, getProgramId, getAccountBalance } from '../utils/solana';
import style from '../styles/Sidebar.module.scss';
import baseStyle from '../styles/Base.module.scss';
import Link from 'next/link';
import { DefaultProps } from '../pages';
import Button from './Button';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'; // Import PublicKey

const Sidebar: NextPage<DefaultProps> = (props) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { pollCount, accountBalance, setAccountBalance, ownerPollCount} = props;
  const defaultAirdropButtonLabel = 'Airdrop 1 SOL';
  const [airdropButtonLabel, setAirdropButtonLabel] = useState(defaultAirdropButtonLabel);
  const { connected } = useWallet();

  const handleAirdrop = async () => {
    if (publicKey) { // Ensure publicKey is not null
      try {
        setAirdropButtonLabel('Creating Txn');
        const txn = await requestAirdrop(connection, publicKey);
        setAirdropButtonLabel('Confirming Txn');
        await confirmTransaction(connection, txn);
        if (setAccountBalance) {
          setAccountBalance((accountBalance ? accountBalance : 0) + convertLamportsToSOL(LAMPORTS_PER_SOL));
        }
      } catch (error) {
        showToaster('Error requesting or confirming airdrop', TOAST_TYPE.ERROR);
      } finally {
        setAirdropButtonLabel(defaultAirdropButtonLabel);
      }
    }
  };

  return (
    <div className={style.sidebar}>
      <div className={style['sidebar-content']}>
        {publicKey && (
          <span className={style['sidebar-data']}>
            <span className={style['wallet-header']}>
              <h2 className={`${baseStyle['heading']} ${style['sub-heading']}`}>WALLET</h2>
              <Button
                design={'primary'}
                className={`${style['airdrop-button']} ${airdropButtonLabel !== defaultAirdropButtonLabel ? style['loading'] : ''}`}
                label={airdropButtonLabel}
                labelWithLoader
                loading={airdropButtonLabel !== defaultAirdropButtonLabel}
                type={'button'}
                onClick={handleAirdrop}
              />
            </span>
            <hr className={style['sidebar-divider']} />
            <p>
              {transformSolanaId(publicKey?.toBase58())}
              <FaRegCopy
                className={style['sidebar-copy-button']}
                onClick={async () => await copyToClipboard(publicKey?.toBase58())}
              />
            </p>
            <p className={style['sidebar-account-bal']}>
              Account Balance:{' '}
              <span className={style['sidebar-account-bal-text']}>
                {`${accountBalance} SOL`}
              </span>
            </p>
          </span>
        )}
        <span className={style['sidebar-data']}>
          <h2 className={`${baseStyle['heading']} ${style['sub-heading']}`}>OVERALL STATS</h2>
          <hr className={style['sidebar-divider']} />
          <p className={style['sidebar-polls']}>
            <span className={style['sidebar-poll-count']}>{pollCount}</span> polls created
          </p>
        </span>
        {publicKey ? ( // Conditionally render ownerPollCount only if publicKey exists
          <span className={style['sidebar-data']}>
            <h2 className={`${baseStyle['heading']} ${style['sub-heading']}`}>PERSONAL STATS</h2>
            <hr className={style['sidebar-divider']} />
            <p className={style['sidebar-polls']}>
              <span className={style['sidebar-poll-count']}>{ownerPollCount}</span> polls created
            </p>
          </span>
        ) : (
          <span className={style['sidebar-data']}>
            <h2 className={`${baseStyle['heading']} ${style['sub-heading']}`}>PERSONAL STATS</h2>
            <hr className={style['sidebar-divider']} />
            <p className={style['sidebar-polls']}>
              <span className={style['sidebar-poll-count']}>0</span> polls created
            </p>
          </span>
        )}
        <div className={style['sidebar-info']}>
          <span className={style['items-center']}>
            {connected ? (
              <WalletDisconnectButton className={style['wallet-button-disconnect']} />
            ) : (
              <WalletMultiButton className={style['wallet-button']} />
            )}
          </span>
          <td className={`${style.td} ${style['program-id']}`}>
            <p>
              Program Id:{' '}
              <Link href={`https://explorer.solana.com/address/${getProgramId().toBase58()}?cluster=devnet`}>
                <a target={'_blank'}>
                  <b>{transformSolanaId(getProgramId().toBase58(), 8)}</b>
                </a>
              </Link>
              <FaRegCopy
                className={style['sidebar-copy-button']}
                onClick={async () => await copyToClipboard(getProgramId().toBase58())}
              />
            </p>
          </td>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
