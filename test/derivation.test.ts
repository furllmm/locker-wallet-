import { describe, expect, it } from 'vitest';
import { defaultDerivationPolicy, materializePath } from '../src/network/derivation.js';

describe('mode derivation policy', () => {
  it('keeps mode branches distinct', () => {
    expect(defaultDerivationPolicy('ethereum', 'normal').pathTemplate).toContain('/0/');
    expect(defaultDerivationPolicy('ethereum', 'ghost').pathTemplate).toContain('/1/');
    expect(defaultDerivationPolicy('ethereum', 'receive-only').pathTemplate).toContain('/2/');
  });
  it('materializes coin and account indexes', () => {
    expect(materializePath("m/44'/COIN'/0'/0/ACCOUNT", 60, 3)).toBe("m/44'/60'/0'/0/3");
  });
});
