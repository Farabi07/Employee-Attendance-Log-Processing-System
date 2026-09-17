import React, { useCallback, useEffect, useRef, useState } from "react";
import { Hash, Globe, MessageCircle, Plus, Users, Paperclip, Send, ChevronLeft, X, MoreHorizontal, Pencil, Trash2, SmilePlus, Check, Download } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { useAuth } from "../lib/auth";
import { useIsMobile } from "../lib/useMediaQuery";
import { api, mediaUrl, downloadUrl } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import { connect as connectChatSocket, disconnect as disconnectChatSocket, on as onChatEvent } from "../lib/chatSocket";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import CreateChannelModal from "../components/CreateChannelModal";
import NewDirectMessageModal from "../components/NewDirectMessageModal";
import ChannelMembersModal from "../components/ChannelMembersModal";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function filenameOf(url) {
  try {
    return decodeURIComponent(url.split("?")[0].split("/").pop() || "attachment");
  } catch {
    return "attachment";
  }
}

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(url.split("?")[0]);
}

// A message.reaction WS event carries only the ONE emoji that just changed
// plus fresh counts for every emoji (see chat/views/message_views.py —
// reacted_by_me is deliberately left out of the broadcast since it's only
// meaningful from the requester's own point of view). Each client rebuilds
// reacted_by_me itself: true for the emoji the event says IT (my own user
// id) just toggled on, otherwise carried over from whatever this client
// already knew for that emoji.
function applyReactionEvent(message, event, myUserId) {
  const prevByEmoji = new Map((message.reactions || []).map((r) => [r.emoji, r]));
  const reactions = (event.reactions || []).map((r) => {
    if (r.emoji === event.emoji && event.user_id === myUserId) {
      return { ...r, reacted_by_me: !event.removed };
    }
    const prev = prevByEmoji.get(r.emoji);
    return { ...r, reacted_by_me: prev?.reacted_by_me || false };
  });
  return { ...message, reactions };
}

function timeAgo(iso) {
  if (!iso) return "";
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function previewOf(message) {
  if (!message) return "No messages yet";
  if (message.is_deleted) return "Message deleted";
  if (message.body) return message.body;
  return message.attachment ? "Sent an attachment" : "";
}

function initialsOf(person) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
}

function isOnline(person) {
  if (typeof person?.is_online === "boolean") return person.is_online;
  if (!person?.last_seen_at) return false;
  return Date.now() - new Date(person.last_seen_at).getTime() < 5 * 60 * 1000;
}

// Role-agnostic — every org member gets chat (managers/moderators additionally
// get channel creation and member management), same as mobile's ChatListScreen
// + ThreadScreen combined into one two-pane layout since desktop has the
// width for it (see App.jsx's Shell for how this plugs into the sidebar).
export default function Chat() {
  const { user, isManagerOrModerator } = useAuth();
  const isMobile = useIsMobile();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState("channels");
  const [channels, setChannels] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState(null); // { type: "channel"|"dm", id, title }

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const [messages, setMessages] = useState([]); // newest-first
  const [loadingThread, setLoadingThread] = useState(false);
  const [page, setPage] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [menuMessage, setMenuMessage] = useState(null); // message whose ⋯ dropdown is open
  const [menuMode, setMenuMode] = useState("actions"); // "actions" | "react"
  const menuRef = useRef(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadList = useCallback(async () => {
    const [channelsRes, conversationsRes, teammatesRes] = await Promise.all([
      api.get(endpoints.channelsMine("?size=100")),
      api.get(endpoints.conversationsMine("?size=100")),
      api.get(endpoints.teammatesAll()),
    ]);
    setChannels(channelsRes.channels || []);
    setConversations(conversationsRes.conversations || []);
    setTeammates(teammatesRes.employees || []);
  }, []);

  useEffect(() => {
    loadList().finally(() => setLoadingList(false));
  }, [loadList]);

  useEffect(() => {
    const refresh = setInterval(loadList, 60000);
    return () => clearInterval(refresh);
  }, [loadList]);

  useEffect(() => {
    connectChatSocket();
    const unsubs = [
      onChatEvent("channel.created", loadList),
      onChatEvent("channel.member_added", loadList),
      onChatEvent("channel.member_removed", loadList),
    ];
    return () => {
      unsubs.forEach((unsub) => unsub());
      disconnectChatSocket();
    };
  }, [loadList]);

  const messagesPath = useCallback(
    (params) => (selected?.type === "channel" ? endpoints.channelMessages(selected.id, params) : endpoints.conversationMessages(selected?.id, params)),
    [selected]
  );
  const sendPath = useCallback(() => (selected?.type === "channel" ? endpoints.channelMessageSend(selected.id) : endpoints.conversationMessageSend(selected.id)), [selected]);
  const markReadPath = useCallback(() => (selected?.type === "channel" ? endpoints.channelMarkRead(selected.id) : endpoints.conversationMarkRead(selected.id)), [selected]);

  useEffect(() => {
    if (!selected) return;
    setLoadingThread(true);
    api
      .get(messagesPath("?size=30"))
      .then((res) => {
        setMessages([...(res.messages || [])].reverse());
        setPage(res.page || null);
      })
      .finally(() => setLoadingThread(false));
    api.post(markReadPath()).catch(() => {});
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.type, selected?.id]);

  useEffect(() => {
    if (!selected) return;
    return onChatEvent("message.new", (event) => {
      const matches =
        selected.type === "channel" ? event.scope === "channel" && event.channel_id === selected.id : event.scope === "dm" && event.conversation_id === selected.id;
      if (!matches) {
        loadList(); // a message came in on a thread that isn't open — refresh unread counts/previews
        return;
      }
      setMessages((cur) => (cur.some((m) => m.id === event.message.id) ? cur : [event.message, ...cur]));
      api.post(markReadPath()).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.type, selected?.id]);

  useEffect(() => {
    if (!selected) return;
    return onChatEvent("message.edited", (event) => {
      const updated = event.message;
      const matches = selected.type === "channel" ? updated.channel === selected.id : updated.conversation === selected.id;
      if (!matches) {
        loadList();
        return;
      }
      setMessages((cur) => (cur.some((m) => m.id === updated.id) ? cur.map((m) => (m.id === updated.id ? updated : m)) : cur));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.type, selected?.id]);

  useEffect(() => {
    if (!selected) return;
    return onChatEvent("message.deleted", (event) => {
      const updated = event.message;
      const matches = selected.type === "channel" ? updated.channel === selected.id : updated.conversation === selected.id;
      if (!matches) {
        loadList();
        return;
      }
      setMessages((cur) => (cur.some((m) => m.id === updated.id) ? cur.map((m) => (m.id === updated.id ? updated : m)) : cur));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.type, selected?.id]);

  // Reactions never change a list preview — patching only needs to check
  // whether the message is in the currently loaded thread page, same
  // idempotent existence check ThreadScreen.tsx uses on mobile.
  useEffect(
    () =>
      onChatEvent("message.reaction", (event) => {
        setMessages((cur) =>
          cur.some((m) => m.id === event.message_id) ? cur.map((m) => (m.id === event.message_id ? applyReactionEvent(m, event, user?.id) : m)) : cur
        );
      }),
    [user?.id]
  );

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuMessage(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const loadOlder = async () => {
    if (loadingOlder || !page || page <= 1) return;
    setLoadingOlder(true);
    try {
      const res = await api.get(messagesPath(`?size=30&page=${page - 1}`));
      setMessages((cur) => [...cur, ...[...(res.messages || [])].reverse()]);
      setPage(res.page || null);
    } finally {
      setLoadingOlder(false);
    }
  };

  const pickAttachment = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
    e.target.value = "";
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !attachment) return;
    setSending(true);
    try {
      let message;
      if (attachment) {
        const form = new FormData();
        if (body) form.append("body", body);
        form.append("attachment", attachment);
        message = await api.post(sendPath(), form);
      } else {
        message = await api.post(sendPath(), { body });
      }
      setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [message, ...cur]));
      setText("");
      setAttachment(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const openMenu = (message) => {
    setMenuMessage(message);
    setMenuMode("actions");
  };
  const closeMenu = () => setMenuMessage(null);

  const startEdit = (message) => {
    setEditingMessage(message);
    setText(message.body || "");
    setAttachment(null);
    closeMenu();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText("");
  };

  const submitEdit = async () => {
    if (!editingMessage) return;
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const updated = await api.post(endpoints.messageEdit(editingMessage.id), { body });
      setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
      setEditingMessage(null);
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const deleteMessageNow = async (message) => {
    try {
      const updated = await api.post(endpoints.messageDelete(message.id));
      setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
      if (editingMessage?.id === message.id) cancelEdit();
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmUnsend = (message) => {
    closeMenu();
    if (window.confirm("Unsend this message? This can't be undone.")) deleteMessageNow(message);
  };

  const react = async (message, emoji) => {
    try {
      const updated = await api.post(endpoints.messageReact(message.id), { emoji });
      setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      alert(err.message);
    }
  };

  const downloadAttachment = async (message) => {
    const url = mediaUrl(message.attachment);
    if (!url || downloadingId) return;
    setDownloadingId(message.id);
    try {
      await downloadUrl(url, filenameOf(url));
    } catch (err) {
      alert(err.message || "Could not download the file");
    } finally {
      setDownloadingId(null);
    }
  };

  const openChannel = (channel) => setSelected({ type: "channel", id: channel.id, title: channel.name });
  const openConversation = (conversation) => {
    const other = conversation.other_participant;
    setSelected({ type: "dm", id: conversation.id, title: other ? `${other.first_name} ${other.last_name}` : "Direct message" });
  };

  const listItems = tab === "channels" ? channels : conversations;
  const conversationsByPerson = new Map(conversations.map((conversation) => [conversation.other_participant?.id, conversation]));
  const directMembers = teammates.map((person) => ({
    person,
    conversation: conversationsByPerson.get(person.id) || null,
  }));
  const showListPane = !isMobile || !selected;
  const showThreadPane = !isMobile || !!selected;

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 190px)", minHeight: 440 }}>
      {showListPane && (
        <div style={{ width: isMobile ? "100%" : 300, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setTab("channels")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: "none",
                background: tab === "channels" ? T.tealBg : T.line2, color: tab === "channels" ? T.tealDeep : T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Hash size={13} /> Channels
            </button>
            <button
              onClick={() => setTab("direct")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: "none",
                background: tab === "direct" ? T.tealBg : T.line2, color: tab === "direct" ? T.tealDeep : T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <MessageCircle size={13} /> Direct
            </button>
            {(tab === "direct" || isManagerOrModerator) && (
              <button
                onClick={() => (tab === "channels" ? setShowCreateChannel(true) : setShowNewDM(true))}
                aria-label={tab === "channels" ? "New channel" : "New direct message"}
                style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: T.teal, color: T.onAccent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingList ? (
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, padding: "8px 4px" }}>Loading…</p>
            ) : tab === "direct" ? (
              directMembers.map(({ person, conversation }) => {
                const other = conversation?.other_participant || person;
                const unread = conversation?.unread_count > 0;
                const isActive = conversation && selected?.type === "dm" && selected?.id === conversation.id;
                return (
                  <Card key={person.id} style={{ padding: 0, border: isActive ? `1px solid ${T.teal}` : `1px solid ${T.line}` }}>
                    <button
                      onClick={async () => {
                        if (conversation) return openConversation(conversation);
                        try {
                          const created = await api.post(endpoints.conversationStart(), { user_id: person.id });
                          openConversation(created);
                          loadList();
                        } catch (error) {
                          window.alert(error.message || "Could not start conversation");
                        }
                      }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 11, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                    >
                      <Avatar initials={initialsOf(other)} size={36} src={mediaUrl(other?.image)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: T.ink, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline(other) ? T.teal : T.faint, flexShrink: 0 }} />
                            {other.first_name} {other.last_name}
                          </p>
                          <span style={{ fontFamily: fontBody, fontSize: 10.5, color: isOnline(other) ? T.tealDeep : T.faint, flexShrink: 0 }}>{isOnline(other) ? "Active now" : "Offline"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 2 }}>
                          <span style={{ fontFamily: fontBody, fontSize: 11.5, color: T.muted }}>{other.org_role || "employee"}{conversation ? ` · ${previewOf(conversation.last_message)}` : " · Start a conversation"}</span>
                          {unread && <span style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: T.coral, color: T.onAccent, fontFamily: fontBody, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{conversation.unread_count > 9 ? "9+" : conversation.unread_count}</span>}
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })
            ) : listItems.length === 0 ? (
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, padding: "8px 4px" }}>
                {tab === "channels" ? (isManagerOrModerator ? "No channels yet — create one." : "Your manager hasn't added you to a channel yet.") : "No conversations yet."}
              </p>
            ) : (
              listItems.map((item) => {
                const isChannel = tab === "channels";
                const other = !isChannel ? item.other_participant : null;
                const unread = item.unread_count > 0;
                const isActive = selected?.type === (isChannel ? "channel" : "dm") && selected?.id === item.id;
                return (
                  <Card
                    key={item.id}
                    style={{ padding: 0, cursor: "pointer", border: isActive ? `1px solid ${T.teal}` : `1px solid ${T.line}` }}
                  >
                    <button
                      onClick={() => (isChannel ? openChannel(item) : openConversation(item))}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 11, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                    >
                      {isChannel ? (
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.tealBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {item.is_public ? <Globe size={16} color={T.tealDeep} /> : <Hash size={16} color={T.tealDeep} />}
                        </div>
                      ) : (
                        <Avatar initials={initialsOf(other)} size={36} src={mediaUrl(other?.image)} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: T.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                            {!isChannel && <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline(other) ? T.teal : T.faint, flexShrink: 0 }} />}
                            {isChannel ? item.name : other ? `${other.first_name} ${other.last_name}` : "Direct message"}
                          </p>
                          <span style={{ fontFamily: fontBody, fontSize: 10.5, color: T.faint, flexShrink: 0 }}>{timeAgo(item.last_message?.created_at || item.updated_at || item.created_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 2 }}>
                          <span
                            style={{ fontFamily: fontBody, fontSize: 12, color: unread ? T.ink : T.muted, fontWeight: unread ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {previewOf(item.last_message)}
                          </span>
                          {unread && (
                            <span style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: T.coral, color: T.onAccent, fontFamily: fontBody, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {item.unread_count > 9 ? "9+" : item.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {showThreadPane && (
        <Card style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.faint, fontFamily: fontBody, fontSize: 13 }}>
              Select a channel or conversation
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${T.line}` }}>
                {isMobile && (
                  <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }} aria-label="Back">
                    <ChevronLeft size={18} color={T.ink} />
                  </button>
                )}
                <p style={{ flex: 1, fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected.title}
                </p>
                {selected.type === "channel" && (
                  <button
                    onClick={() => setShowMembers(true)}
                    aria-label="Channel members"
                    style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: T.tealBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Users size={14} color={T.tealDeep} />
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column-reverse", gap: 10 }}>
                {loadingThread ? (
                  <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, textAlign: "center" }}>Loading…</p>
                ) : (
                  <>
                    {page > 1 && (
                      <button
                        onClick={loadOlder}
                        disabled={loadingOlder}
                        style={{ alignSelf: "center", border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 0" }}
                      >
                        {loadingOlder ? "Loading…" : "Load earlier messages"}
                      </button>
                    )}
                    {messages.map((m) => {
                      const isSelf = m.sender?.id === user?.id;
                      const deleted = !!m.is_deleted;
                      const showActions = !deleted && (hoveredMessageId === m.id || menuMessage?.id === m.id);
                      return (
                        <div
                          key={m.id}
                          onMouseEnter={() => setHoveredMessageId(m.id)}
                          onMouseLeave={() => setHoveredMessageId((cur) => (cur === m.id ? null : cur))}
                          style={{ display: "flex", gap: 8, maxWidth: "72%", alignSelf: isSelf ? "flex-end" : "flex-start", flexDirection: isSelf ? "row-reverse" : "row" }}
                        >
                          {!isSelf && (
                            <div style={{ flexShrink: 0, marginTop: selected.type === "channel" ? 16 : 0 }}>
                              <Avatar initials={initialsOf(m.sender)} size={26} src={mediaUrl(m.sender?.image)} />
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start", minWidth: 0 }}>
                            {selected.type === "channel" && !isSelf && (
                              <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 2, marginLeft: 4 }}>
                                {m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "Unknown"}
                              </span>
                            )}
                            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, flexDirection: isSelf ? "row-reverse" : "row" }}>
                              <div
                                style={{
                                  borderRadius: 14,
                                  padding: !deleted && !!m.attachment && !m.body && isImageUrl(m.attachment) ? 4 : "9px 12px",
                                  background: deleted ? "transparent" : isSelf ? T.teal : T.line2,
                                  color: isSelf ? T.onAccent : T.ink,
                                  border: deleted ? `1px dashed ${T.line}` : "none",
                                  fontFamily: fontBody,
                                  fontSize: 13.5,
                                  fontStyle: deleted ? "italic" : "normal",
                                  wordBreak: "break-word",
                                }}
                              >
                                {deleted ? (
                                  <span style={{ color: T.faint }}>This message was deleted</span>
                                ) : (
                                  <>
                                    {!!m.body && <span>{m.body}</span>}
                                    {!!m.attachment && isImageUrl(m.attachment) && (
                                      <button
                                        onClick={() => downloadAttachment(m)}
                                        title="Download image"
                                        style={{
                                          position: "relative", display: "block", border: "none", padding: 0, marginTop: m.body ? 6 : 0, cursor: "pointer",
                                          borderRadius: 10, overflow: "hidden", width: 220, height: 160, background: "none",
                                        }}
                                      >
                                        <img src={mediaUrl(m.attachment)} alt="Attachment" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        <span
                                          style={{
                                            position: "absolute", bottom: 6, right: 6, width: 26, height: 26, borderRadius: "50%",
                                            background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center",
                                          }}
                                        >
                                          {downloadingId === m.id ? (
                                            <span style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                          ) : (
                                            <Download size={13} color="#fff" />
                                          )}
                                        </span>
                                      </button>
                                    )}
                                    {!!m.attachment && !isImageUrl(m.attachment) && (
                                      <button
                                        onClick={() => downloadAttachment(m)}
                                        disabled={downloadingId === m.id}
                                        style={{
                                          display: "flex", alignItems: "center", gap: 5, marginTop: m.body ? 4 : 0, border: "none", background: "transparent",
                                          padding: 0, cursor: "pointer", color: isSelf ? T.onAccent : T.navyDeep, fontFamily: fontBody, fontSize: 13, maxWidth: 200,
                                        }}
                                      >
                                        <Download size={12} style={{ flexShrink: 0 }} />
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{filenameOf(m.attachment)}</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                              {showActions && (
                                <button
                                  onClick={() => openMenu(m)}
                                  aria-label="Message actions"
                                  style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: T.line2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                >
                                  <MoreHorizontal size={13} color={T.muted} />
                                </button>
                              )}

                              {menuMessage?.id === m.id && (
                                <div
                                  ref={menuRef}
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    marginTop: 4,
                                    [isSelf ? "right" : "left"]: 0,
                                    background: T.card,
                                    border: `1px solid ${T.line}`,
                                    borderRadius: 10,
                                    boxShadow: `0 8px 24px rgba(${T.shadow}, 0.16)`,
                                    zIndex: 20,
                                    minWidth: menuMode === "react" ? "auto" : 140,
                                    overflow: "hidden",
                                  }}
                                >
                                  {menuMode === "actions" ? (
                                    <>
                                      <button
                                        onClick={() => setMenuMode("react")}
                                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: fontBody, fontSize: 12.5, color: T.ink, textAlign: "left" }}
                                      >
                                        <SmilePlus size={14} /> React
                                      </button>
                                      {isSelf && (
                                        <>
                                          <button
                                            onClick={() => startEdit(m)}
                                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: fontBody, fontSize: 12.5, color: T.ink, textAlign: "left" }}
                                          >
                                            <Pencil size={14} /> Edit
                                          </button>
                                          <button
                                            onClick={() => confirmUnsend(m)}
                                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.coral, textAlign: "left" }}
                                          >
                                            <Trash2 size={14} /> Unsend
                                          </button>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <div style={{ display: "flex", gap: 4, padding: 8 }}>
                                      {QUICK_REACTIONS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            react(m, emoji);
                                            closeMenu();
                                          }}
                                          style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {!deleted && m.reactions?.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                {m.reactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    onClick={() => react(m, r.emoji)}
                                    style={{
                                      display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 999, cursor: "pointer",
                                      background: r.reacted_by_me ? T.tealBg : T.line2, border: `1px solid ${r.reacted_by_me ? T.teal : "transparent"}`,
                                      fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: r.reacted_by_me ? T.tealDeep : T.muted,
                                    }}
                                  >
                                    <span style={{ fontSize: 12.5 }}>{r.emoji}</span> {r.count}
                                  </button>
                                ))}
                              </div>
                            )}

                            <span style={{ fontFamily: fontBody, fontSize: 10, color: T.faint, marginTop: 3, marginInline: 4 }}>
                              {timeOf(m.created_at)}
                              {!deleted && !!m.edited_at && <em> · edited</em>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {attachment && !editingMessage && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px 8px" }}>
                  <Paperclip size={13} color={T.muted} />
                  <span style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }} aria-label="Remove attachment">
                    <X size={13} color={T.coral} />
                  </button>
                </div>
              )}

              {editingMessage && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: T.tealBg, borderTop: `1px solid ${T.line}` }}>
                  <Pencil size={13} color={T.tealDeep} />
                  <span style={{ flex: 1, fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.tealDeep, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Editing message</span>
                  <button onClick={cancelEdit} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }} aria-label="Cancel edit">
                    <X size={15} color={T.tealDeep} />
                  </button>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: 12, borderTop: `1px solid ${T.line}` }}>
                {!editingMessage && (
                  <>
                    <input ref={fileInputRef} type="file" onChange={pickAttachment} style={{ display: "none" }} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach a file"
                      style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: T.line2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                      <Paperclip size={15} color={T.muted} />
                    </button>
                  </>
                )}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      editingMessage ? submitEdit() : send();
                    }
                  }}
                  placeholder={editingMessage ? "Edit message…" : "Message…"}
                  rows={1}
                  style={{ flex: 1, resize: "none", maxHeight: 100, borderRadius: 18, border: `1px solid ${T.line}`, padding: "9px 14px", fontFamily: fontBody, fontSize: 13.5, boxSizing: "border-box" }}
                />
                <button
                  onClick={editingMessage ? submitEdit : send}
                  disabled={sending || (!text.trim() && !attachment)}
                  aria-label={editingMessage ? "Save edit" : "Send"}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", border: "none", background: T.teal, color: T.onAccent, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: sending || (!text.trim() && !attachment) ? 0.5 : 1,
                  }}
                >
                  {editingMessage ? <Check size={14} /> : <Send size={14} />}
                </button>
              </div>
            </>
          )}
        </Card>
      )}

      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreated={(channel) => {
            setShowCreateChannel(false);
            loadList();
            openChannel(channel);
          }}
        />
      )}

      {showNewDM && (
        <NewDirectMessageModal
          onClose={() => setShowNewDM(false)}
          onStarted={(conversation) => {
            setShowNewDM(false);
            loadList();
            openConversation(conversation);
          }}
        />
      )}

      {showMembers && selected?.type === "channel" && (
        <ChannelMembersModal channelId={selected.id} onClose={() => setShowMembers(false)} onChanged={loadList} />
      )}
    </div>
  );
}
