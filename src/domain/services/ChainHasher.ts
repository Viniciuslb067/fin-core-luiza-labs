import { createHash } from 'crypto';

export function computeLedgerHash(input: {
  accountNumber: string;
  type: string;
  amount: string;
  fee: string;
  occurredAtIso: string;
  prevHash: string | null;
  description?: string | null;
}): string {
  const payload = [
    input.accountNumber,
    input.type,
    input.amount,
    input.fee,
    input.occurredAtIso,
    input.prevHash ?? '',
    input.description ?? '',
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}
