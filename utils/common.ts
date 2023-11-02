import { toast } from 'react-toastify';

enum TOAST_TYPE {
  INFO,
  SUCCESS,
  ERROR,
  WARNING,
}

const transformSolanaId = (
  transactionId: string | undefined,
  len: number = 13
): string => {
  if (transactionId) {
    if (transactionId.includes(' ')) return transactionId;
    return `${transactionId.substring(0, len)}...${transactionId.substring(
      transactionId.length - len,
      transactionId.length
    )}`;
  }

  return '';
};

const transformQuestion = (question: string, len: number) => {
  return question.length > len ? `${question.substring(0, len)}...` : question;
};

const copyToClipboard = async (
  text: string | undefined,
  toasterMessage: string = 'Copied to clipboard!',
  showToaster = true
) => {
  if (text) {
    await navigator.clipboard.writeText(text);
    if (showToaster)
      toast(toasterMessage, {
        type: 'info',
      });
  }
};

const generateId = (length: number): string => {
  var result = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charLen = chars.length;
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charLen));
  }
  return result;
};

const convertEpochToISODate = (epoch: string) => {
  return new Date(Number(epoch) * 1000).toUTCString().replace('GMT', '').trim();
};

const showToaster = (message: string, type: TOAST_TYPE) => {
  switch (type) {
    case TOAST_TYPE.ERROR: {
      toast(message, { type: 'error' });
      break;
    }
    case TOAST_TYPE.WARNING: {
      toast(message, { type: 'warning' });
      break;
    }
    case TOAST_TYPE.INFO: {
      toast(message, { type: 'info' });
      break;
    }
    case TOAST_TYPE.SUCCESS: {
      toast(message, { type: 'success' });
      break;
    }
  }
};

export {
  TOAST_TYPE,
  transformSolanaId,
  transformQuestion,
  copyToClipboard,
  generateId,
  convertEpochToISODate,
  showToaster,
};
