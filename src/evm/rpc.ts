export interface RpcClientOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export class EvmRpcClient {
  readonly url: string;
  readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private nextId = 1;

  constructor(url: string, options: RpcClientOptions = {}) {
    if (!/^https?:\/\//i.test(url)) throw new Error('RPC URL must be HTTP(S)');
    this.url = url;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(method: string, params: unknown[] = []): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const id = this.nextId++;
    try {
      const response = await this.fetchImpl(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      const body = await response.json() as JsonRpcResponse<T>;
      if (body.error) throw new Error(`RPC ${body.error.code}: ${body.error.message}`);
      if (body.result === undefined) throw new Error('RPC response has no result');
      return body.result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`RPC request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  chainId(): Promise<string> { return this.request('eth_chainId'); }
  getBalance(address: string, block = 'latest'): Promise<string> { return this.request('eth_getBalance', [address, block]); }
  getTransactionCount(address: string, block = 'pending'): Promise<string> { return this.request('eth_getTransactionCount', [address, block]); }
  gasPrice(): Promise<string> { return this.request('eth_gasPrice'); }
  estimateGas(tx: Record<string, string>): Promise<string> { return this.request('eth_estimateGas', [tx]); }
  call(tx: Record<string, string>, block = 'latest'): Promise<string> { return this.request('eth_call', [tx, block]); }
  sendRawTransaction(raw: string): Promise<string> { return this.request('eth_sendRawTransaction', [raw]); }
}
