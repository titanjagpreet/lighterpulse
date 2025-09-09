import { TxDetails } from "../types/transaction";

export async function getTransactionDetails(hash: string): Promise<TxDetails | null> {
    try {
        const res = await fetch(
            `https://mainnet.zklighter.elliot.ai/api/v1/tx?by=hash&value=${hash}`,
            {
                headers: { accept: "application/json" },
                cache: "no-store"
            }
        );

        if (!res.ok) return null;

        const data = await res.json();
        if (!data || data.code !== 200) return null;

        const info = JSON.parse(data.info);

        // timestamps in UTC
        const formatUTC = (timestamp: number) => new Date(timestamp).toISOString();

        // (Byte array -> String)
        const memo = info.Memo ? Buffer.from(info.Memo).toString("utf-8").trim() : "";

        return {
            hash: data.hash,
            type: data.type,
            fromAccountIndex: info.FromAccountIndex,
            toAccountIndex: info.ToAccountIndex,
            usdcAmount: info.USDCAmount / 1e6,
            fee: info.Fee / 1e6,
            memo,
            expiredAt: formatUTC(info.ExpiredAt),
            nonce: info.Nonce,
            l1Address: data.l1_address,
            accountIndex: data.account_index,
            blockHeight: data.block_height,
            queuedAt: formatUTC(data.queued_at),
            executedAt: formatUTC(data.executed_at),
            status: data.status
        };
    } catch (error) {
        console.error("Error fetching transaction details:", error);
        return null;
    }
}