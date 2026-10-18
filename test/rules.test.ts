import { describe, expect, it } from 'vitest';
import { canSign } from '../src/rules/modes.js';

describe('signing rules', () => {
  it('blocks ghost mode', () => {
    expect(canSign({ mode: 'ghost', balanceUsd: 1000 })).toMatchObject({ allowed: false });
  });

  it('blocks receive-only mode', () => {
    expect(canSign({ mode: 'receive-only', balanceUsd: 1000 })).toMatchObject({ allowed: false });
  });

  it('blocks balances below the spending threshold', () => {
    expect(canSign({ mode: 'normal', balanceUsd: 9, spendingThresholdUsd: 10 })).toMatchObject({ allowed: false });
  });

  it('allows signing when policy passes', () => {
    expect(canSign({ mode: 'normal', balanceUsd: 100, spendingThresholdUsd: 10 })).toEqual({ allowed: true });
  });
});
