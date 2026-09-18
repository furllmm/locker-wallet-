import { describe, expect, it } from 'vitest';
import { createCustomEvmNetwork, normalizeWalletCoreRegistry } from '../src/network/registry.js';

describe('network registry', () => {
  it('normalizes Wallet Core metadata', () => {
    const [eth] = normalizeWalletCoreRegistry([{ id: 'ethereum', name: 'Ethereum', symbol: 'ETH', decimals: 18, coinId: 60, blockchain: 'Ethereum', derivation: [{ path: "m/44'/60'/0'/0/0" }], chainId: '1' }]);
    expect(eth?.id).toBe('ethereum');
    expect(eth?.derivation?.[0]?.path).toBe("m/44'/60'/0'/0/0");
  });
  it('creates custom EVM network without touching Wallet Core', () => {
    const n = createCustomEvmNetwork({ id: 'my-chain', name: 'My Chain', symbol: 'MYC', chainId: 12345, rpcUrl: 'https://rpc.example' });
    expect(n.kind).toBe('custom-evm');
    expect(n.chainId).toBe('12345');
    expect(n.derivation?.[0]?.path).toBe("m/44'/60'/0'/0/0");
  });
});
