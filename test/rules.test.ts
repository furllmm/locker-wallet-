import { describe, expect, it } from 'vitest';
import { assertCanSign } from '../src/rules/modes.js';

describe('signing rules', () => {
  it('blocks ghost mode', () => expect(() => assertCanSign({ mode: 'ghost', balanceUsd: 1000, spending: { enabled: false, minimumUsd: 0 } })).toThrow('SIGNING_BLOCKED_GHOST_MODE'));
  it('blocks receive-only mode', () => expect(() => assertCanSign({ mode: 'receive-only', balanceUsd: 1000, spending: { enabled: false, minimumUsd: 0 } })).toThrow('SIGNING_BLOCKED_RECEIVE_ONLY'));
  it('blocks below spending threshold', () => expect(() => assertCanSign({ mode: 'normal', balanceUsd: 9, spending: { enabled: true, minimumUsd: 10 } })).toThrow('SIGNING_BLOCKED_SPENDING_THRESHOLD'));
  it('allows signing when policy passes', () => expect(() => assertCanSign({ mode: 'normal', balanceUsd: 100, spending: { enabled: true, minimumUsd: 10 } })).not.toThrow());
});
