import { describe, expect, it } from 'vitest';
import {
  createDefaultWalletSettings,
  deleteSavingRule,
  evaluateSavingRules,
  setDefaultWallet,
  upsertSavingRule,
  validateWalletSettings,
  type SavingRule,
} from '../src/settings/wallet-settings.js';

const baseRule: SavingRule = {
  id: 'small-to-main',
  enabled: true,
  sourceWalletId: 'savings',
  targetWalletId: 'main',
  minimumTransferUsd: 10,
  behavior: 'block',
};

describe('wallet settings', () => {
  it('starts with no preferred wallet and no saving rules', () => {
    expect(createDefaultWalletSettings()).toEqual({
      version: 1,
      defaultWalletId: null,
      savingRules: [],
    });
  });

  it('validates the default wallet and saving-rule wallet references', () => {
    expect(() => validateWalletSettings({
      version: 1,
      defaultWalletId: 'missing',
      savingRules: [],
    }, ['main', 'savings'])).toThrow('Default wallet does not exist');

    expect(() => validateWalletSettings({
      version: 1,
      defaultWalletId: 'main',
      savingRules: [baseRule],
    }, ['main'])).toThrow('Saving rule references a wallet that does not exist');
  });

  it('blocks a transfer below the minimum threshold', () => {
    expect(evaluateSavingRules({
      sourceWalletId: 'savings',
      targetWalletId: 'main',
      transferValueUsd: 9.99,
      rules: [baseRule],
    })).toMatchObject({ allowed: false, blockedByRuleIds: ['small-to-main'] });
  });

  it('allows a transfer equal to the threshold', () => {
    expect(evaluateSavingRules({
      sourceWalletId: 'savings',
      targetWalletId: 'main',
      transferValueUsd: 10,
      rules: [baseRule],
    }).allowed).toBe(true);
  });

  it('warns without blocking when configured to warn', () => {
    expect(evaluateSavingRules({
      sourceWalletId: 'savings',
      targetWalletId: 'main',
      transferValueUsd: 2,
      rules: [{ ...baseRule, behavior: 'warn' }],
    })).toMatchObject({ allowed: true, warnings: ['Transfer is below the configured minimum of $10.00 (rule small-to-main).'] });
  });

  it('ignores disabled and non-matching rules', () => {
    expect(evaluateSavingRules({
      sourceWalletId: 'savings',
      targetWalletId: 'main',
      transferValueUsd: 2,
      rules: [
        { ...baseRule, enabled: false },
        { ...baseRule, id: 'other-route', sourceWalletId: 'gas-tank' },
      ],
    })).toMatchObject({ allowed: true, matchedRuleIds: [] });
  });

  it('rejects invalid thresholds and duplicate rule IDs', () => {
    expect(() => validateWalletSettings({
      version: 1,
      defaultWalletId: null,
      savingRules: [{ ...baseRule, minimumTransferUsd: Number.NaN }],
    })).toThrow('finite non-negative');

    expect(() => validateWalletSettings({
      version: 1,
      defaultWalletId: null,
      savingRules: [baseRule, { ...baseRule, targetWalletId: 'gas-tank' }],
    })).toThrow('Duplicate saving rule ID');
  });
});


describe('Saving Rules management helpers', () => {
  const walletIds = ['main', 'savings'];
  const rule: SavingRule = {
    id: 'rule-1',
    enabled: true,
    sourceWalletId: 'main',
    targetWalletId: 'savings',
    minimumTransferUsd: 5,
    behavior: 'block',
  };

  it('adds and replaces a rule without mutating the original settings', () => {
    const original = createDefaultWalletSettings();
    const added = upsertSavingRule(original, rule, walletIds);
    expect(original.savingRules).toHaveLength(0);
    expect(added.savingRules).toEqual([rule]);
    const replaced = upsertSavingRule(added, { ...rule, minimumTransferUsd: 10 }, walletIds);
    expect(replaced.savingRules).toHaveLength(1);
    expect(replaced.savingRules[0]?.minimumTransferUsd).toBe(10);
  });

  it('deletes a rule idempotently', () => {
    const withRule = upsertSavingRule(createDefaultWalletSettings(), rule, walletIds);
    expect(deleteSavingRule(withRule, 'rule-1').savingRules).toHaveLength(0);
    expect(deleteSavingRule(withRule, 'not-found').savingRules).toHaveLength(1);
  });

  it('sets and clears the default wallet while validating references', () => {
    const initial = createDefaultWalletSettings();
    expect(setDefaultWallet(initial, 'main', walletIds).defaultWalletId).toBe('main');
    expect(setDefaultWallet(initial, null, walletIds).defaultWalletId).toBeNull();
    expect(() => setDefaultWallet(initial, 'missing', walletIds)).toThrow('Default wallet does not exist');
  });

  it('rejects malformed runtime data instead of trusting persisted JSON', () => {
    expect(() => validateWalletSettings({ version: 1, defaultWalletId: null, savingRules: null } as unknown as ReturnType<typeof createDefaultWalletSettings>)).toThrow('Saving rules must be an array');
  });
});
