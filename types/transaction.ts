export interface TxDetails {
    hash: string;
    type: number;
    fromAccountIndex: number;
    toAccountIndex: number;
    usdcAmount: number;
    fee: number;
    memo: string;
    expiredAt: string;
    nonce: number;
    l1Address: string;
    accountIndex: number;
    blockHeight: number;
    queuedAt: string;
    executedAt: string;
    status: number;
}