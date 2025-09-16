import { Metrics } from "./getOtherStats";

interface CachedMetricsResponse {
    data: Metrics;
    source: "cache" | "fresh" | "stale";
}

export async function getCachedMetrics(): Promise<Metrics | null> {
    try {
        const res = await fetch('/api/metrics', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error('Failed to fetch cached metrics:', res.status);
            return null;
        }

        const response: CachedMetricsResponse = await res.json();
        return response.data;
    } catch (error) {
        console.error('Error fetching cached metrics:', error);
        return null;
    }
}
