export const OperationType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  TRANSFER: 'TRANSFER',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export const OPERATION_TYPES = [
  OperationType.DEPOSIT,
  OperationType.WITHDRAW,
  OperationType.TRANSFER,
  OperationType.TRANSFER_OUT,
  OperationType.TRANSFER_IN,
] as const;
