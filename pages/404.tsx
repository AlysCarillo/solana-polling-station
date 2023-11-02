import { NextPage } from 'next';
import style from '../styles/Base.module.scss';

const NotFound: NextPage = () => {
  return (
    <div className={style['child-content']}>
      <h1 className={`${style['heading']} ${style['not-found']}`}>
        404 | Not Found
      </h1>
    </div>
  );
};

export default NotFound;
