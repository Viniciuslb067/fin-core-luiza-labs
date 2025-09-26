import { createHash } from 'crypto';

export type HashInput = {
  accountNumber: string;
  type: string;
  amount: string;
  fee: string;
  occurredAtIso: string;
  prevHash: string | null;
  description?: string | null;
};

export function computeLedgerHash(i: HashInput) {
  const s = JSON.stringify(i);
  return createHash('sha256').update(s).digest('hex');
}
