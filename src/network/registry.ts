import type { CustomEvmNetworkInput, NetworkDefinition } from './types.js';

export function normalizeWalletCoreRegistry(raw: unknown): NetworkDefinition[] {
  if (!Array.isArray(raw)) throw new Error('Invalid Wallet Core registry: expected array');
  return raw.map((item: any) => ({
    id: String(item.id),
    name: String(item.displayName ?? item.name),
    symbol: String(item.symbol),
    decimals: Number(item.decimals ?? 0),
    ...(item.coinId === undefined ? {} : { coinId: Number(item.coinId) }),
    ...(item.blockchain === undefined ? {} : { blockchain: String(item.blockchain) }),
    ...(item.chainId === undefined ? {} : { chainId: String(item.chainId) }),
    derivation: Array.isArray(item.derivation) ? item.derivation.map((d: any) => ({
      ...(d.name === undefined ? {} : { name: String(d.name) }),
      path: String(d.path)
    })) : [],
    kind: 'wallet-core' as const,
    ...(item.info?.rpc ? { rpcUrl: String(item.info.rpc) } : {}),
    ...(item.explorer?.url ? { explorerUrl: String(item.explorer.url) } : {}),
    ...(item.explorer?.txPath ? { explorerTxPath: String(item.explorer.txPath) } : {}),
    ...(item.explorer?.accountPath ? { explorerAccountPath: String(item.explorer.accountPath) } : {})
  }));
}

export function createCustomEvmNetwork(input: CustomEvmNetworkInput): NetworkDefinition {
  const id = input.id.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) throw new Error('Invalid custom EVM id');
  if (!input.name.trim()) throw new Error('Network name is required');
  if (!input.symbol.trim()) throw new Error('Currency symbol is required');
  if (!/^https?:\/\//i.test(input.rpcUrl)) throw new Error('RPC URL must be HTTP(S)');
  const chainId = String(input.chainId).trim();
  if (!/^\d+$/.test(chainId)) throw new Error('EVM chain ID must be numeric');
  const path = input.derivationPath ?? "m/44'/60'/0'/0/0";
  return {
    id,
    name: input.name.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    decimals: input.decimals ?? 18,
    chainId,
    derivation: [{ name: 'default', path }],
    kind: 'custom-evm',
    rpcUrl: input.rpcUrl.trim(),
    ...(input.explorerUrl?.trim() ? { explorerUrl: input.explorerUrl.trim() } : {})
  };
}
