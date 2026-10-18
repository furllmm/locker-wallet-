import { canSign, type SigningContext } from '../rules/modes.js';
import type { TransactionDraft } from './types.js';
import type { WalletSettings } from '../settings/wallet-settings.js';

export interface SpendingGuardContext extends SigningContext {
  fromLockerId: string;
  fromAccountId: string;
  /** Configured per-transaction hard cap. Null/undefined disables this additional cap. */
  maxTransactionUsd?: number | null;
  /** Trusted USD valuation of the full transaction amount, excluding fees unless caller includes them. */
  transactionValueUsd?: number;
}

export function assertSigningAllowed(draft: TransactionDraft, context: SpendingGuardContext): void {
  if (draft.intent.fromLockerId !== context.fromLockerId || draft.intent.fromAccountId !== context.fromAccountId) {
    throw new Error('Signing source does not match transaction source');
  }

  const result = canSign(context);
  if (!result.allowed) throw new Error(result.reason ?? 'Signing blocked by wallet policy');

  if (context.maxTransactionUsd !== undefined && context.maxTransactionUsd !== null) {
    if (!Number.isFinite(context.maxTransactionUsd) || context.maxTransactionUsd <= 0) {
      throw new Error('Maximum transaction USD must be a finite positive number');
    }
    // Fail closed: a configured cap must never be bypassed by omitting a price quote.
    if (context.transactionValueUsd === undefined ||
        !Number.isFinite(context.transactionValueUsd) ||
        context.transactionValueUsd < 0) {
      throw new Error('A valid transaction USD valuation is required by the spending limit');
    }
    if (context.transactionValueUsd > context.maxTransactionUsd) {
      throw new Error(`Transaction exceeds the configured spending limit of $${context.maxTransactionUsd.toFixed(2)}.`);
    }
  }
}


/** Applies the persisted wallet spending cap instead of relying on each caller to copy it manually. */
export function assertSigningAllowedWithWalletSettings(
  draft: TransactionDraft,
  context: Omit<SpendingGuardContext, 'maxTransactionUsd'> & { transactionValueUsd?: number },
  settings: WalletSettings,
): void {
  assertSigningAllowed(draft, {
    ...context,
    maxTransactionUsd: settings.maxTransactionUsd ?? null,
  });
}
