/**
 * Wallet Settings domain model.
 *
 * Saving rules only evaluate a user-requested transfer. They never create,
 * sign, or broadcast transactions. The caller must provide a trusted USD
 * valuation for the proposed transfer.
 */
export type SavingRuleBehavior = 'block' | 'warn';

export interface SavingRule {
  id: string;
  enabled: boolean;
  sourceWalletId: string;
  targetWalletId: string;
  /** Minimum USD value required for a transfer matching this rule. */
  minimumTransferUsd: number;
  behavior: SavingRuleBehavior;
}

export interface WalletSettings {
  version: 1;
  /** Wallet ID preselected by receive/send UI; null means no preference. */
  defaultWalletId: string | null;
  savingRules: SavingRule[];
}

export interface SavingRuleEvaluation {
  allowed: boolean;
  matchedRuleIds: string[];
  warnings: string[];
  blockedByRuleIds: string[];
}

export function createDefaultWalletSettings(): WalletSettings {
  return { version: 1, defaultWalletId: null, savingRules: [] };
}

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} cannot be empty`);
}

export function validateWalletSettings(
  settings: WalletSettings,
  availableWalletIds?: readonly string[],
): WalletSettings {
  if (settings.version !== 1) throw new Error('Unsupported wallet settings version');
  if (settings.defaultWalletId !== null) {
    assertNonEmpty(settings.defaultWalletId, 'Default wallet ID');
    if (availableWalletIds && !availableWalletIds.includes(settings.defaultWalletId)) {
      throw new Error('Default wallet does not exist');
    }
  }

  const ids = new Set<string>();
  for (const rule of settings.savingRules) {
    assertNonEmpty(rule.id, 'Saving rule ID');
    assertNonEmpty(rule.sourceWalletId, 'Saving rule source wallet ID');
    assertNonEmpty(rule.targetWalletId, 'Saving rule target wallet ID');
    if (rule.sourceWalletId === rule.targetWalletId) {
      throw new Error('Saving rule source and target wallets must differ');
    }
    if (ids.has(rule.id)) throw new Error('Duplicate saving rule ID');
    ids.add(rule.id);
    if (!Number.isFinite(rule.minimumTransferUsd) || rule.minimumTransferUsd < 0) {
      throw new Error('Saving rule minimumTransferUsd must be a finite non-negative number');
    }
    if (rule.behavior !== 'block' && rule.behavior !== 'warn') {
      throw new Error('Unsupported saving rule behavior');
    }
    if (availableWalletIds &&
        (!availableWalletIds.includes(rule.sourceWalletId) || !availableWalletIds.includes(rule.targetWalletId))) {
      throw new Error('Saving rule references a wallet that does not exist');
    }
  }

  return {
    version: 1,
    defaultWalletId: settings.defaultWalletId,
    savingRules: settings.savingRules.map(rule => ({ ...rule })),
  };
}

/**
 * Evaluates a proposed transfer against configured rules.
 * Transfers below the threshold are blocked or warned according to each rule.
 * Equality with the threshold passes. No transfer is ever performed here.
 */
export function evaluateSavingRules(input: {
  sourceWalletId: string;
  targetWalletId: string;
  transferValueUsd: number;
  rules: readonly SavingRule[];
}): SavingRuleEvaluation {
  if (!Number.isFinite(input.transferValueUsd) || input.transferValueUsd < 0) {
    throw new Error('Transfer USD value must be a finite non-negative number');
  }

  const matchedRuleIds: string[] = [];
  const warnings: string[] = [];
  const blockedByRuleIds: string[] = [];

  for (const rule of input.rules) {
    if (!rule.enabled ||
        rule.sourceWalletId !== input.sourceWalletId ||
        rule.targetWalletId !== input.targetWalletId ||
        input.transferValueUsd >= rule.minimumTransferUsd) {
      continue;
    }

    matchedRuleIds.push(rule.id);
    if (rule.behavior === 'block') {
      blockedByRuleIds.push(rule.id);
    } else {
      warnings.push(`Transfer is below the configured minimum of $${rule.minimumTransferUsd.toFixed(2)} (rule ${rule.id}).`);
    }
  }

  return {
    allowed: blockedByRuleIds.length === 0,
    matchedRuleIds,
    warnings,
    blockedByRuleIds,
  };
}
