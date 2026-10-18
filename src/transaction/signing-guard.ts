import { canSign, type SigningContext } from '../rules/modes.js';
import type { TransactionDraft } from './types.js';
import { evaluateSavingRules, validateWalletSettings, type WalletSettings } from '../settings/wallet-settings.js';

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
  const validatedSettings = validateWalletSettings(settings);
  assertSigningAllowed(draft, {
    ...context,
    maxTransactionUsd: validatedSettings.maxTransactionUsd ?? null,
  });

  // Saving rules only apply to wallet-to-wallet transfers. External sends have
  // no destination wallet ID and are intentionally handled by the USD cap instead.
  if (draft.intent.kind === 'transfer' && draft.intent.to.lockerId) {
    const matchingBlockingRules = validatedSettings.savingRules.filter(rule =>
      rule.enabled &&
      rule.behavior === 'block' &&
      rule.sourceWalletId === draft.intent.fromLockerId &&
      rule.targetWalletId === draft.intent.to.lockerId
    );
    if (matchingBlockingRules.length > 0 &&
        (context.transactionValueUsd === undefined ||
         !Number.isFinite(context.transactionValueUsd) ||
         context.transactionValueUsd < 0)) {
      throw new Error('A valid transaction USD valuation is required by the matching saving rule');
    }

    const evaluation = evaluateSavingRules({
      sourceWalletId: draft.intent.fromLockerId,
      targetWalletId: draft.intent.to.lockerId,
      transferValueUsd: context.transactionValueUsd ?? 0,
      rules: validatedSettings.savingRules,
    });
    if (!evaluation.allowed) {
      throw new Error(`Transfer blocked by saving rule(s): ${evaluation.blockedByRuleIds.join(', ')}`);
    }
  }
}
