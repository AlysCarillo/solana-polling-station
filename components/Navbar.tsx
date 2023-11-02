import {
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { NextPage } from 'next';
import Button from './Button';

import style from '../styles/Navbar.module.scss';
import baseStyle from '../styles/Base.module.scss';
import { useRouter } from 'next/router';

require('@solana/wallet-adapter-react-ui/styles.css');

const Navbar: NextPage = () => {
  const router = useRouter();
  return (
    <div className={`${baseStyle['main-content']} ${style['navbar']}`}>
      <div className={style['items']}>
        <Button
          design={'primary'}
          className={style['fa-item-add']}
          icon={'plus'}
          iconSize='18px'
          type={'button'}
          onClick={() => {
            router.push('/create');
          }}
        />

        <span className={style['items-center']}>
          <WalletMultiButton className={style['wallet-button']} />
          <WalletDisconnectButton className={style['wallet-button']} />
        </span>
        <Button
          design={'primary'}
          className={style['fa-item-home']}
          icon={'home'}
          iconSize='18px'
          type={'button'}
          onClick={() => {
            router.push('/');
          }}
        />
      </div>
    </div>
  );
};

export default Navbar;
