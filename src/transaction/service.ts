import type { TransactionDraft, TransactionIntent } from './types.js';
import { createInternalTransfer } from './transfer.js';

export interface InternalAccountRef {
  lockerId: string;
  accountId: string;
  networkId: string;
  address: string;
}

export function validateIntent(intent: TransactionIntent): void {
  if (!intent.fromLockerId.trim() || !intent.fromAccountId.trim()) throw new Error('Source account is required');
  if (!intent.networkId.trim()) throw new Error('Network is required');
  if (!intent.to.address.trim()) throw new Error('Destination address is required');
  if (!/^[0-9]+$/.test(intent.amountBaseUnits) || intent.amountBaseUnits === '0') throw new Error('Amount must be positive base units');
  if (intent.asset.networkId !== intent.networkId) throw new Error('Asset network mismatch');
  if (!Number.isInteger(intent.asset.decimals) || intent.asset.decimals < 0 || intent.asset.decimals > 255) throw new Error('Invalid asset decimals');
}

export function createSend(input: Omit<TransactionIntent, 'kind'>, now = new Date()): TransactionDraft {
  const intent: TransactionIntent = { ...input, kind: 'send' };
  validateIntent(intent);
  return { id: crypto.randomUUID(), intent, createdAt: now.toISOString() };
}

export function createTransfer(input: {
  from: InternalAccountRef;
  to: InternalAccountRef;
  asset: TransactionIntent['asset'];
  amountBaseUnits: string;
  memo?: string;
}, now = new Date()): TransactionDraft {
  if (input.from.networkId !== input.to.networkId) throw new Error('Internal transfer requires the same network');
  if (input.from.address === input.to.address) throw new Error('Source and destination must be different');
  return createInternalTransfer(input, now);
}
