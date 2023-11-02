import { NextPage } from 'next';
import { PropagateLoader } from 'react-spinners';

import BaseStyle from '../styles/Base.module.scss';

export interface LoaderProps {
  //   loading: boolean | undefined;
}

const Loader: NextPage<LoaderProps> = (props) => {
  return (
    <span className={BaseStyle['spinner']}>
      <PropagateLoader color='#613469' loading={true} />
    </span>
  );
};

export default Loader;
