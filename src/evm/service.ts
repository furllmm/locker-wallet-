import type { NetworkDefinition } from '../network/types.js';
import { deriveAddress } from '../core/wallet-core.js';
import { EvmRpcClient } from './rpc.js';
import { encodeErc20Transfer, normalizeAddress } from './encoding.js';
import { parseHexQuantity } from './quantity.js';

export function requireEvmNetwork(network: NetworkDefinition): asserts network is NetworkDefinition & { chainId: string; rpcUrl: string } {
  if (!network.rpcUrl) throw new Error(`Network ${network.id} has no RPC URL`);
  if (!network.chainId || !/^\d+$/.test(network.chainId)) throw new Error(`Network ${network.id} has no valid EVM chain ID`);
}

export function createEvmRpc(network: NetworkDefinition, options?: ConstructorParameters<typeof EvmRpcClient>[1]): EvmRpcClient {
  requireEvmNetwork(network);
  return new EvmRpcClient(network.rpcUrl, options);
}

export async function deriveCustomEvmAddress(mnemonic: string, derivationPath: string, passphrase = ''): Promise<string> {
  return deriveAddress(mnemonic, 'ethereum', derivationPath, passphrase);
}

export async function getNativeBalance(rpc: EvmRpcClient, address: string): Promise<bigint> {
  normalizeAddress(address);
  return parseHexQuantity(await rpc.getBalance(address), 'native balance');
}

function encodeBalanceOf(address: string): string {
  return `0x70a08231${address.slice(2).padStart(64, '0')}`;
}

export async function getErc20Balance(rpc: EvmRpcClient, token: string, owner: string): Promise<bigint> {
  normalizeAddress(token); normalizeAddress(owner);
  const result = await rpc.call({ to: token, data: encodeBalanceOf(owner) });
  return parseHexQuantity(result, 'ERC-20 balance');
}

export interface EvmNativeTxDraft {
  chainId: bigint;
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to?: string;
  value: bigint;
  data: string;
}

export async function prepareNativeTransfer(rpc: EvmRpcClient, input: {
  from: string; to: string; value: bigint; data?: string;
}): Promise<EvmNativeTxDraft> {
  normalizeAddress(input.from); normalizeAddress(input.to);
  if (input.value < 0n) throw new Error('Transfer value cannot be negative');
  const [chainIdHex, nonceHex, gasPriceHex] = await Promise.all([
    rpc.chainId(), rpc.getTransactionCount(input.from, 'pending'), rpc.gasPrice(),
  ]);
  const gasLimitHex = await rpc.estimateGas({ from: input.from, to: input.to, value: `0x${input.value.toString(16)}`, data: input.data ?? '0x' });
  return {
    chainId: parseHexQuantity(chainIdHex, 'chain ID'), nonce: parseHexQuantity(nonceHex, 'nonce'),
    gasPrice: parseHexQuantity(gasPriceHex, 'gas price'), gasLimit: parseHexQuantity(gasLimitHex, 'gas limit'),
    to: input.to, value: input.value, data: input.data ?? '0x',
  };
}

export function prepareErc20TransferData(to: string, amount: bigint): string {
  return encodeErc20Transfer(to, amount);
}
