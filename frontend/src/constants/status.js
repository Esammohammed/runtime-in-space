// Status is always shown as a word and a shape, never colour alone.
export const STATUS = {
  green: { label: 'Normal', symbol: '●', className: 'status-green' },
  yellow: { label: 'Watch', symbol: '◆', className: 'status-yellow' },
  red: { label: 'Act', symbol: '▲', className: 'status-red' },
};

export const UNKNOWN_STATUS = { label: 'No data', symbol: '○', className: 'status-none' };

export const statusOf = (status) => STATUS[status] ?? UNKNOWN_STATUS;

export const BODY_AREAS = {
  head: 'Head and mind',
  heart: 'Heart and vessels',
  lungs: 'Lungs',
  metabolism: 'Metabolism',
  body: 'Whole body',
};

export const POLL_INTERVAL_MS = 2000;
