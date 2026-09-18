export type NetworkKind = 'wallet-core' | 'custom-evm';

export interface DerivationPolicy {
  name?: string;
  path: string;
}

export interface NetworkDefinition {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  coinId?: number;
  blockchain?: string;
  chainId?: string;
  derivation?: DerivationPolicy[];
  kind: NetworkKind;
  rpcUrl?: string;
  explorerUrl?: string;
  explorerTxPath?: string;
  explorerAccountPath?: string;
}

export interface CustomEvmNetworkInput {
  id: string;
  name: string;
  symbol: string;
  decimals?: number;
  chainId: number | string;
  rpcUrl: string;
  explorerUrl?: string;
  derivationPath?: string;
}
