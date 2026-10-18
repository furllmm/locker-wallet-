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
  /** Optional hard cap per signed transaction, in USD. Null disables this cap. */
  maxTransactionUsd?: number | null;
}

export interface SavingRuleEvaluation {
  allowed: boolean;
  matchedRuleIds: string[];
  warnings: string[];
  blockedByRuleIds: string[];
}

export function createDefaultWalletSettings(): WalletSettings {
  return { version: 1, defaultWalletId: null, savingRules: [], maxTransactionUsd: null };
}

function assertNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function validateWalletSettings(
  settings: WalletSettings,
  availableWalletIds?: readonly string[],
): WalletSettings {
  if (!settings || typeof settings !== 'object' || settings.version !== 1) throw new Error('Unsupported wallet settings version');
  if (!Array.isArray(settings.savingRules)) throw new Error('Saving rules must be an array');
  const maxTransactionUsd = settings.maxTransactionUsd ?? null;
  if (maxTransactionUsd !== null && (!Number.isFinite(maxTransactionUsd) || maxTransactionUsd <= 0)) {
    throw new Error('Maximum transaction USD must be a finite positive number or null');
  }
  if (settings.defaultWalletId !== null) {
    assertNonEmpty(settings.defaultWalletId, 'Default wallet ID');
    if (availableWalletIds && !availableWalletIds.includes(settings.defaultWalletId)) {
      throw new Error('Default wallet does not exist');
    }
  }

  const ids = new Set<string>();
  for (const rule of settings.savingRules) {
    if (!rule || typeof rule !== 'object') throw new Error('Invalid saving rule');
    if (typeof rule.enabled !== 'boolean') throw new Error('Saving rule enabled must be a boolean');
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
    maxTransactionUsd,
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


/** Adds or replaces a rule without mutating the caller's settings object. */
export function upsertSavingRule(
  settings: WalletSettings,
  rule: SavingRule,
  availableWalletIds?: readonly string[],
): WalletSettings {
  const current = validateWalletSettings(settings, availableWalletIds);
  const nextRules = current.savingRules.filter(existing => existing.id !== rule.id);
  nextRules.push({ ...rule });
  return validateWalletSettings({ ...current, savingRules: nextRules }, availableWalletIds);
}

/** Removes a rule by ID. Removing a missing ID is intentionally idempotent. */
export function deleteSavingRule(settings: WalletSettings, ruleId: string): WalletSettings {
  assertNonEmpty(ruleId, 'Saving rule ID');
  const current = validateWalletSettings(settings);
  return { ...current, savingRules: current.savingRules.filter(rule => rule.id !== ruleId) };
}

/** Sets the preferred wallet; null clears the preference. */
export function setDefaultWallet(
  settings: WalletSettings,
  walletId: string | null,
  availableWalletIds?: readonly string[],
): WalletSettings {
  return validateWalletSettings({ ...settings, defaultWalletId: walletId }, availableWalletIds);
}
