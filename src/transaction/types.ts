export type TransactionKind = 'send' | 'transfer';

export interface AssetRef {
  networkId: string;
  symbol: string;
  decimals: number;
  contractAddress?: string;
}

export interface TransactionTarget {
  address: string;
  lockerId?: string;
  accountId?: string;
}

export interface TransactionIntent {
  kind: TransactionKind;
  fromLockerId: string;
  fromAccountId: string;
  networkId: string;
  asset: AssetRef;
  amountBaseUnits: string;
  to: TransactionTarget;
  memo?: string;
}

export interface TransactionDraft {
  id: string;
  intent: TransactionIntent;
  createdAt: string;
}
