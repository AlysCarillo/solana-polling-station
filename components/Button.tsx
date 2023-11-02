import { NextPage } from 'next';
import { MouseEventHandler } from 'react';
import { FaHome, FaPlus } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';

import BaseStyle from '../styles/Base.module.scss';

export interface ButtonProps {
  loading?: boolean;
  design: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset' | undefined;
  icon?: 'plus' | 'home' | undefined;
  iconSize?: string | undefined;
  className?: string | undefined;
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
  width?: 'string' | undefined;
  labelWithLoader?: boolean;
  disabled?: boolean;
}

const Button: NextPage<ButtonProps> = (props) => {
  return (
    <button
      onClick={props.onClick}
      type={props.type}
      disabled={props.loading || props.disabled}
      className={`${
        BaseStyle[
          props.design == 'primary' ? 'primary-button' : 'secondary-button'
        ]
      }  ${props.className}`}
    >
      <span className={BaseStyle['button-loader']}>
        {props.loading ? (
          <>
            <PulseLoader size={'7px'} color='#999' />
            {props.labelWithLoader ? (
              <span className={BaseStyle['loader-label']}>{props.label}</span>
            ) : (
              <></>
            )}
          </>
        ) : (
          <>
            {getIcon(props.icon, props.iconSize)}
            {props.label}{' '}
          </>
        )}
      </span>
    </button>
  );
};

const getIcon = (
  icon: ButtonProps['icon'],
  size: ButtonProps['iconSize']
): JSX.Element => {
  switch (icon) {
    case 'plus': {
      return <FaPlus size={size ? size : '16px'} />;
    }
    case 'home': {
      return <FaHome size={size ? size : '16px'} />;
    }
    default: {
      return <></>;
    }
  }
};

export default Button;
