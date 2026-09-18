import { describe, expect, it, vi } from 'vitest';
import { EvmRpcClient } from '../src/evm/rpc.js';
import { encodeErc20Transfer, encodeLegacySigningPayload, rlpEncode } from '../src/evm/encoding.js';
import { getErc20Balance, getNativeBalance, prepareNativeTransfer } from '../src/evm/service.js';

describe('EVM layer', () => {
  it('encodes ERC-20 transfer data', () => {
    expect(encodeErc20Transfer('0x1111111111111111111111111111111111111111', 1n)).toBe(
      '0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001'
    );
  });

  it('encodes an EIP-155 signing payload', () => {
    const encoded = encodeLegacySigningPayload({ nonce: 1n, gasPrice: 2n, gasLimit: 21000n, to: '0x1111111111111111111111111111111111111111', value: 3n, data: '0x', chainId: 1n });
    expect(encoded.startsWith('0xf8')).toBe(true);
    expect(encoded).toContain('01825208');
  });

  it('handles native and ERC-20 balance RPC calls', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const result = body.method === 'eth_getBalance' ? '0x2a' : '0x10';
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }), { status: 200 });
    });
    const rpc = new EvmRpcClient('https://rpc.example', { fetchImpl });
    expect(await getNativeBalance(rpc, '0x1111111111111111111111111111111111111111')).toBe(42n);
    expect(await getErc20Balance(rpc, '0x2222222222222222222222222222222222222222', '0x1111111111111111111111111111111111111111')).toBe(16n);
  });

  it('prepares a native transfer from RPC state', async () => {
    const results: Record<string, string> = { eth_chainId: '0x1', eth_getTransactionCount: '0x3', eth_gasPrice: '0x5', eth_estimateGas: '0x5208' };
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: results[body.method] }), { status: 200 });
    });
    const rpc = new EvmRpcClient('https://rpc.example', { fetchImpl });
    const draft = await prepareNativeTransfer(rpc, { from: '0x1111111111111111111111111111111111111111', to: '0x2222222222222222222222222222222222222222', value: 10n });
    expect(draft).toMatchObject({ chainId: 1n, nonce: 3n, gasPrice: 5n, gasLimit: 21000n, value: 10n });
  });
});
