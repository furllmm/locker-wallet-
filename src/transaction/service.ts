import type { TransactionDraft, TransactionIntent } from './types.js';
import { createInternalTransfer } from './transfer.js';
import { resolveDefaultWalletId, validateWalletSettings, type WalletSettings } from '../settings/wallet-settings.js';

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


export interface AvailableWalletAccount {
  lockerId: string;
  accountId: string;
}

/**
 * Creates a Send draft using the configured preferred wallet.
 * If the preference is unset/stale, it falls back to the first available account.
 * This only selects the source; it never signs or broadcasts a transaction.
 */
export function createSendUsingDefaultWallet(input: {
  settings: WalletSettings;
  availableAccounts: readonly AvailableWalletAccount[];
  networkId: string;
  asset: TransactionIntent['asset'];
  amountBaseUnits: string;
  to: TransactionIntent['to'];
  memo?: string;
}, now = new Date()): TransactionDraft {
  const settings = validateWalletSettings(input.settings);
  const walletIds = [...new Set(input.availableAccounts.map(account => account.lockerId))];
  const selectedLockerId = resolveDefaultWalletId(settings, walletIds);
  if (selectedLockerId === null) throw new Error('No available wallet account to send from');
  const selectedAccount = input.availableAccounts.find(account => account.lockerId === selectedLockerId);
  if (!selectedAccount) throw new Error('The selected default wallet has no available account');

  return createSend({
    fromLockerId: selectedAccount.lockerId,
    fromAccountId: selectedAccount.accountId,
    networkId: input.networkId,
    asset: input.asset,
    amountBaseUnits: input.amountBaseUnits,
    to: input.to,
    ...(input.memo !== undefined ? { memo: input.memo } : {}),
  }, now);
}
