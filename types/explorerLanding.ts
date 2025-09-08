// types/explorer.ts

export interface Block {
    commitment: string;
    height: number;
    state_root: string;
    priority_operations: number;
    on_chain_l2_operations: number;
    pending_on_chain_operations_pub_data: string;
    committed_tx_hash: string;
    committed_at: number;
    verified_tx_hash: string;
    verified_at: number;
    txs: string[];
    status: number;
    size: number;
}

export interface BlocksApiResponse {
    code: number;
    total: number;
    blocks: Block[];
}

export interface CurrentHeightResponse {
    code: number;
    height: number;
}

export interface BlockTableItem {
    height: number;
    link: string;
}

export interface TxTableItem {
    txHash: string;
    link: string;
}

export interface ExplorerData {
    blocks: BlockTableItem[];
    transactions: TxTableItem[];
}