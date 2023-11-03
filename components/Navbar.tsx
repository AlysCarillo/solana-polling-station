import { NextPage } from 'next';
import Button from './Button';

import style from '../styles/Navbar.module.scss';
import baseStyle from '../styles/Base.module.scss';
import { useRouter } from 'next/router';
import Image from 'next/image';
import solanaLogo from '../public/assets/images/solana.svg';

require('@solana/wallet-adapter-react-ui/styles.css');

const Navbar: NextPage = () => {
  const router = useRouter();
  return (
    <div className={`${baseStyle['main-content']} ${style['navbar']}`}>
      <div className={style['items']}>
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
        <div className={style['logo-container']}>
          <Image 
            className={style['logo']}
            src={solanaLogo}
            alt='Solana Logo'
            width={40}
            height={40}
          />
          <h4><b>SOLANA POLLING STATION</b></h4>
        </div>
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
      </div>
    </div>
  );
};

export default Navbar;
