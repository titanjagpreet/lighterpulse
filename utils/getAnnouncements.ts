export interface Announcement {
    title: string;
    content: string;
    created_at: string;
}

export async function getAnnouncements(): Promise<Announcement[] | null> {
    try {
        const res = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/announcement", {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store"
        });

        if (!res.ok) {
            console.error("Failed to fetch announcements", res.status);
            return null;
        }

        const data = await res.json();

        const announcementsArray = Array.isArray(data.announcements) ? data.announcements : [];

        return announcementsArray
            .map((item: any) => ({
                title: item.title,
                content: item.content,
                created_at: new Date(item.created_at * 1000).toUTCString()
            }))
            .sort((a: Announcement, b: Announcement) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return null;
    }
}