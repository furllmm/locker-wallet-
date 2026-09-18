import type { TransactionDraft, TransactionIntent } from './types.js';
import type { InternalAccountRef } from './service.js';

export function createInternalTransfer(input: {
  from: InternalAccountRef;
  to: InternalAccountRef;
  asset: TransactionIntent['asset'];
  amountBaseUnits: string;
  memo?: string;
}, now = new Date()): TransactionDraft {
  const intent: TransactionIntent = {
    kind: 'transfer',
    fromLockerId: input.from.lockerId,
    fromAccountId: input.from.accountId,
    networkId: input.from.networkId,
    asset: input.asset,
    amountBaseUnits: input.amountBaseUnits,
    to: { address: input.to.address, lockerId: input.to.lockerId, accountId: input.to.accountId },
    ...(input.memo ? { memo: input.memo } : {}),
  };
  return { id: crypto.randomUUID(), intent, createdAt: now.toISOString() };
}
