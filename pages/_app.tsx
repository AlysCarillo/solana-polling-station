import '../styles/globals.scss';
import type { AppProps } from 'next/app';
import { useMemo, useState } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

import style from '../styles/Base.module.scss';
import Head from 'next/head';

function MyApp({ Component, pageProps: { ...pageProps } }: AppProps) {
  const network = WalletAdapterNetwork.Devnet;
  const [pollCount, setPollCount] = useState(0);
  const [accountBalance, setAccountBalance] = useState(0);

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <>
      <Head>
        <meta name='viewport' content='width=1280px' />
      </Head>
      <ToastContainer position={'top-right'} closeOnClick />
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Navbar />
            <Sidebar
              accountBalance={accountBalance}
              pollCount={pollCount}
              setAccountBalance={setAccountBalance}
            />
            <div className={`${style['main-content']} ${style['content']}`}>
              <div className={style['card']}>
                <Component
                  setPollCount={setPollCount}
                  setAccountBalance={setAccountBalance}
                  {...pageProps}
                />
              </div>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </>
  );
}

export default MyApp;
