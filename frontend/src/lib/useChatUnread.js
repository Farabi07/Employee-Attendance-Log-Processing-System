import { useEffect, useState } from "react";
import { api } from "./api";
import { endpoints } from "./endpoints";

// Powers the "Chat" nav item's badge in Sidebar.jsx — same 20s polling
// cadence as NotificationBell.jsx's own feed. Mirrors mobile's
// lib/useChatUnread.ts.
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
        const channelUnread = (channelsRes.channels || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
        const conversationUnread = (conversationsRes.conversations || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
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
