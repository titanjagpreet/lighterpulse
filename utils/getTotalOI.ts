export interface TotalOIResponse {
    total_open_interest_usd: string;
  }
  
export async function getTotalOI(): Promise<TotalOIResponse | null> {
  try {
    const res = await fetch("https://lighter-oi-production.up.railway.app/api/open-interest", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.total_open_interest_usd) return null;

    return { total_open_interest_usd: data.total_open_interest_usd };
  } catch (error) {
    console.error("Error fetching total OI:", error);
    return null;
  }
} 