export interface TotalLiquidationResponse {
    total_24h_liquidation_usd: string;
  }
  
export async function getTotalLiquidation(): Promise<TotalLiquidationResponse | null> {
  try {
    const res = await fetch("https://lighter-liquidation-production.up.railway.app/api/liquidations", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.total_24h_liquidation_usd) return null;

    return { total_24h_liquidation_usd: data.total_24h_liquidation_usd };
  } catch (error) {
    console.error("Error fetching total liquidation:", error);
    return null;
  }
} 