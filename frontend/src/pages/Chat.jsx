import React, { useCallback, useEffect, useRef, useState } from "react";
import { Hash, MessageCircle, Plus, Users, Paperclip, Send, ChevronLeft, X } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { useAuth } from "../lib/auth";
import { useIsMobile } from "../lib/useMediaQuery";
import { api, mediaUrl } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import { connect as connectChatSocket, disconnect as disconnectChatSocket, on as onChatEvent } from "../lib/chatSocket";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import CreateChannelModal from "../components/CreateChannelModal";
import NewDirectMessageModal from "../components/NewDirectMessageModal";
import ChannelMembersModal from "../components/ChannelMembersModal";

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
  if (message.body) return message.body;
  return message.attachment ? "Sent an attachment" : "";
}

function initialsOf(person) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
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

  const loadList = useCallback(async () => {
    const [channelsRes, conversationsRes] = await Promise.all([
      api.get(endpoints.channelsMine("?size=100")),
      api.get(endpoints.conversationsMine("?size=100")),
    ]);
    setChannels(channelsRes.channels || []);
    setConversations(conversationsRes.conversations || []);
  }, []);

  useEffect(() => {
    loadList().finally(() => setLoadingList(false));
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

  const openChannel = (channel) => setSelected({ type: "channel", id: channel.id, title: channel.name });
  const openConversation = (conversation) => {
    const other = conversation.other_participant;
    setSelected({ type: "dm", id: conversation.id, title: other ? `${other.first_name} ${other.last_name}` : "Direct message" });
  };

  const listItems = tab === "channels" ? channels : conversations;
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
                style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: T.teal, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingList ? (
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, padding: "8px 4px" }}>Loading…</p>
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
                          <Hash size={16} color={T.tealDeep} />
                        </div>
                      ) : (
                        <Avatar initials={initialsOf(other)} size={36} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: T.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                            <span style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: T.coral, color: "#fff", fontFamily: fontBody, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                      return (
                        <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start", maxWidth: "72%", alignSelf: isSelf ? "flex-end" : "flex-start" }}>
                          {selected.type === "channel" && !isSelf && (
                            <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 2, marginLeft: 4 }}>
                              {m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "Unknown"}
                            </span>
                          )}
                          <div
                            style={{
                              borderRadius: 14,
                              padding: "9px 12px",
                              background: isSelf ? T.teal : T.line2,
                              color: isSelf ? "#fff" : T.ink,
                              fontFamily: fontBody,
                              fontSize: 13.5,
                              wordBreak: "break-word",
                            }}
                          >
                            {!!m.body && <span>{m.body}</span>}
                            {!!m.attachment && (
                              <a href={mediaUrl(m.attachment)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: m.body ? 4 : 0, color: isSelf ? "#fff" : T.navyDeep }}>
                                <Paperclip size={12} /> Attachment
                              </a>
                            )}
                          </div>
                          <span style={{ fontFamily: fontBody, fontSize: 10, color: T.faint, marginTop: 3, marginInline: 4 }}>{timeOf(m.created_at)}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {attachment && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px 8px" }}>
                  <Paperclip size={13} color={T.muted} />
                  <span style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }} aria-label="Remove attachment">
                    <X size={13} color={T.coral} />
                  </button>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: 12, borderTop: `1px solid ${T.line}` }}>
                <input ref={fileInputRef} type="file" onChange={pickAttachment} style={{ display: "none" }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach a file"
                  style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: T.line2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Paperclip size={15} color={T.muted} />
                </button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Message…"
                  rows={1}
                  style={{ flex: 1, resize: "none", maxHeight: 100, borderRadius: 18, border: `1px solid ${T.line}`, padding: "9px 14px", fontFamily: fontBody, fontSize: 13.5, boxSizing: "border-box" }}
                />
                <button
                  onClick={send}
                  disabled={sending || (!text.trim() && !attachment)}
                  aria-label="Send"
                  style={{
                    width: 34, height: 34, borderRadius: "50%", border: "none", background: T.teal, color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: sending || (!text.trim() && !attachment) ? 0.5 : 1,
                  }}
                >
                  <Send size={14} />
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
