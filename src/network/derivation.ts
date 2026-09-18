import type { LockerMode } from '../rules/modes.js';

export interface DerivationPolicy {
  networkId: string;
  mode: LockerMode;
  pathTemplate: string;
  source: 'network-default' | 'mode-branch' | 'custom';
}

export const MODE_BRANCH: Record<LockerMode, number> = {
  normal: 0,
  ghost: 1,
  'receive-only': 2,
  test: 3,
};

/**
 * Generic EVM-compatible mode policy. Other chains must use their registry
 * derivation standard instead of assuming this path is valid for them.
 */
export function evmModeDerivationPolicy(networkId: string, mode: LockerMode): DerivationPolicy {
  return {
    networkId,
    mode,
    pathTemplate: `m/44'/60'/0'/${MODE_BRANCH[mode]}/ACCOUNT`,
    source: 'mode-branch',
  };
}

export function customDerivationPolicy(networkId: string, mode: LockerMode, pathTemplate: string): DerivationPolicy {
  if (!/^m(?:\/[0-9]+'?)*$/.test(pathTemplate.replace('ACCOUNT', '0'))) {
    throw new Error('Invalid derivation path template');
  }
  if (!pathTemplate.includes('ACCOUNT')) throw new Error('Derivation path must contain ACCOUNT');
  return { networkId, mode, pathTemplate, source: 'custom' };
}

export function materializePath(template: string, accountIndex: number): string {
  if (!Number.isInteger(accountIndex) || accountIndex < 0) throw new Error('Invalid account index');
  return template.replaceAll('ACCOUNT', String(accountIndex));
}
