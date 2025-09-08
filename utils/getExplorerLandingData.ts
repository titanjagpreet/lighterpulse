import { Block, BlocksApiResponse, CurrentHeightResponse, BlockTableItem, TxTableItem, ExplorerData } from "../types/explorerLanding";

export async function getExplorerData(): Promise<ExplorerData | null> {
    try {
        // 1. Fetch current height
        const currentHeightRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/currentHeight", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (!currentHeightRes.ok) {
            console.error("Failed to fetch current height", currentHeightRes.status);
            return null;
        }

        const currentHeightData = await currentHeightRes.json();
        const currentHeight: number = currentHeightData.height;

        // 2. Fetch latest 10 blocks using currentHeight as index
        const blocksRes = await fetch(`https://mainnet.zklighter.elliot.ai/api/v1/blocks?index=${currentHeight}&limit=10&sort=desc`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (!blocksRes.ok) {
            console.error("Failed to fetch blocks", blocksRes.status);
            return null;
        }

        const blocksData = await blocksRes.json();
        const blocks = blocksData.blocks || [];

        // 3. Model data for blocks table (5 latest blocks)
        const blocksArray: BlockTableItem[] = blocks.slice(0, 5).map((block: any) => ({
            height: block.height,
            link: `/explorer/block/${block.height}`
        }));

        // 4. Find first block that has transactions
        const blockWithTxs = blocks.find((block: any) => block.txs && block.txs.length > 0);

        // 5. Model data for transactions table
        const transactionsArray: TxTableItem[] = blockWithTxs
            ? blockWithTxs.txs.slice(0, 6).map((txHash: string) => ({
                  txHash,
                  link: `/explorer/tx/${txHash}`
              }))
            : [];

        return {
            blocks: blocksArray,
            transactions: transactionsArray
        };
    } catch (error) {
        console.error("Error fetching explorer data:", error);
        return null;
    }
}