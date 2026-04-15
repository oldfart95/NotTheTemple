export const formatPrice = (value?: number, currency = 'USD'): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  const maximumFractionDigits = Math.abs(value) < 10 ? 4 : 2;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(value);
};

export const formatCompactNumber = (value?: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
};

export const formatPercent = (value?: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatSigned = (value?: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
};

export const formatTime = (value?: string): string => {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
};

export const timeAgo = (value?: string): string => {
  if (!value) {
    return 'never';
  }

  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));

  if (seconds < 5) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
};
