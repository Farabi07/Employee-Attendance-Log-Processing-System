import { useEffect, useState } from "react";
import { api } from "./api";
import { endpoints } from "./endpoints";

// Powers the "Chat" tab's badge in navigation/AppTabs.tsx — same 20s
// polling cadence as NotificationBell.tsx's own feed, kept as its own
// small hook (rather than folding into ChatListScreen) since the badge
// has to show up on every tab, not just while Chat is open.
export function useChatUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [channelsRes, conversationsRes] = await Promise.all([
          api.get(endpoints.channelsMine("?size=100")),
          api.get(endpoints.conversationsMine("?size=100")),
        ]);
        if (cancelled) return;
        const channelUnread = (channelsRes.channels || []).reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
        const conversationUnread = (conversationsRes.conversations || []).reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
        setCount(channelUnread + conversationUnread);
      } catch {
        // silent — polling, don't disrupt the UI on a transient failure
      }
    };

    load();
    const id = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return count;
}
