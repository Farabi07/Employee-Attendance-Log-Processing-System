import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ChevronLeft, Users, Paperclip, Send, Pencil, Trash2, SmilePlus, X, Check } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { api, BASE_URL, getToken, mediaUrl } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { on as onChatEvent } from "../../lib/chatSocket";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import ChannelMembersScreen from "./ChannelMembersScreen";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initialsOf(person: any) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
}

// A message.reaction WS event carries only the ONE emoji that just
// changed plus fresh counts for every emoji (see chat/views/message_views.py
// — reacted_by_me is deliberately left out of the broadcast since it's only
// meaningful from the requester's own point of view). Each client rebuilds
// reacted_by_me itself: true for the emoji the event says IT (my own user
// id) just toggled on, otherwise carried over from whatever this client
// already knew for that emoji.
function applyReactionEvent(message: any, event: any, myUserId?: number) {
  const prevByEmoji = new Map<string, any>((message.reactions || []).map((r: any) => [r.emoji, r]));
  const reactions = (event.reactions || []).map((r: any) => {
    if (r.emoji === event.emoji && event.user_id === myUserId) {
      return { ...r, reacted_by_me: !event.removed };
    }
    const prev = prevByEmoji.get(r.emoji);
    return { ...r, reacted_by_me: prev?.reacted_by_me || false };
  });
  return { ...message, reactions };
}

type ThreadProps = { type: "channel" | "dm"; id: number; title: string; onBack: () => void };

// Shared by both channel and DM threads (see ChatListScreen) so there's one
// message list, one composer, and one WebSocket-wiring code path instead of
// two near-duplicate screens. Pushed as a full-screen Modal — this app has
// no in-tab stack navigator (see AppTabs.tsx), so "drilling in" from a tab
// always means a Modal, same as AccountMenu.tsx.
export default function ThreadScreen({ type, id, title, onBack }: ThreadProps) {
  const T = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          backgroundColor: T.card,
        },
        backButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.line2 },
        headerTitle: { flex: 1, fontFamily: fonts.display.semibold, fontSize: 16, color: T.ink },
        membersButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.tealBg },
        listContent: { padding: 16, gap: 10, flexGrow: 1, justifyContent: "flex-end" },
        loadingOlder: { paddingVertical: 12 },
        bubbleWrap: { maxWidth: "82%", flexDirection: "row", alignItems: "flex-end", gap: 6 },
        bubbleWrapSelf: { alignSelf: "flex-end" },
        bubbleWrapOther: { alignSelf: "flex-start" },
        avatarSlot: { marginBottom: 2 },
        bubbleRow: { flexShrink: 1 },
        senderName: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.muted, marginBottom: 3, marginLeft: 4 },
        bubble: { borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
        bubbleSelf: { backgroundColor: T.teal, borderBottomRightRadius: 4 },
        bubbleOther: { backgroundColor: T.card, borderBottomLeftRadius: 4 },
        bubbleDeleted: { backgroundColor: "transparent", borderWidth: 1, borderColor: T.line, borderStyle: "dashed" },
        bubbleText: { fontFamily: fonts.body.regular, fontSize: 13.5 },
        bubbleTextSelf: { color: T.onAccent },
        bubbleTextOther: { color: T.ink },
        bubbleTextDeleted: { fontFamily: fonts.body.regular, fontStyle: "italic", fontSize: 13, color: T.faint },
        editedTag: { fontFamily: fonts.body.regular, fontSize: 10, fontStyle: "italic" },
        attachmentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
        attachmentText: { fontFamily: fonts.body.medium, fontSize: 12.5, textDecorationLine: "underline" },
        bubbleTime: { fontFamily: fonts.body.regular, fontSize: 10, color: T.faint, marginTop: 3, marginHorizontal: 4 },
        reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4, marginHorizontal: 4 },
        reactionPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingVertical: 2.5,
          paddingHorizontal: 7,
          borderRadius: 999,
          backgroundColor: T.line2,
          borderWidth: 1,
          borderColor: "transparent",
        },
        reactionPillActive: { backgroundColor: T.tealBg, borderColor: T.teal },
        reactionEmoji: { fontSize: 12.5 },
        reactionCount: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.muted },
        reactionCountActive: { color: T.tealDeep },
        editBar: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: T.tealBg,
          borderTopWidth: 1,
          borderTopColor: T.line,
        },
        editBarText: { flex: 1, fontFamily: fonts.body.medium, fontSize: 12, color: T.tealDeep },
        composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.card },
        attachButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: T.line2 },
        input: {
          flex: 1,
          maxHeight: 100,
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 9,
          fontFamily: fonts.body.regular,
          fontSize: 13.5,
          color: T.ink,
        },
        sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: T.teal },
        pendingAttachment: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 6 },
        pendingAttachmentText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, flexShrink: 1 },
        pendingAttachmentRemove: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.coral },
        sheetBackdrop: { flex: 1, backgroundColor: "rgba(22,35,58,0.25)", justifyContent: "flex-end" },
        sheetPanel: {
          backgroundColor: T.card,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          paddingBottom: 24,
          paddingTop: 8,
        },
        sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.line, alignSelf: "center", marginBottom: 8 },
        sheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 20 },
        sheetRowText: { fontFamily: fonts.body.medium, fontSize: 14.5, color: T.ink },
        sheetRowTextDanger: { color: T.coral, fontFamily: fonts.body.semibold },
        sheetRowPressed: { backgroundColor: T.line2 },
        emojiPickerRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 16, paddingVertical: 10 },
        emojiPickerButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
        emojiPickerButtonPressed: { backgroundColor: T.line2 },
        emojiPickerEmoji: { fontSize: 24 },
      }),
    [T]
  );

  const [messages, setMessages] = useState<any[]>([]); // newest-first — index 0 renders at the bottom of the inverted list
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [sheetMessage, setSheetMessage] = useState<any>(null);
  const [sheetMode, setSheetMode] = useState<"actions" | "react">("actions");

  const messagesPath = useCallback(
    (params: string) => (type === "channel" ? endpoints.channelMessages(id, params) : endpoints.conversationMessages(id, params)),
    [type, id]
  );
  const sendPath = useCallback(() => (type === "channel" ? endpoints.channelMessageSend(id) : endpoints.conversationMessageSend(id)), [type, id]);
  const markReadPath = useCallback(() => (type === "channel" ? endpoints.channelMarkRead(id) : endpoints.conversationMarkRead(id)), [type, id]);

  const loadLatest = useCallback(async () => {
    const res = await api.get(messagesPath("?size=30"));
    setMessages([...(res.messages || [])].reverse());
    setPage(res.page || null);
  }, [messagesPath]);

  useEffect(() => {
    setLoading(true);
    loadLatest().finally(() => setLoading(false));
    api.post(markReadPath()).catch(() => {});
  }, [loadLatest, markReadPath]);

  useEffect(
    () =>
      onChatEvent("message.new", (event: any) => {
        const matches = type === "channel" ? event.scope === "channel" && event.channel_id === id : event.scope === "dm" && event.conversation_id === id;
        if (!matches) return;
        setMessages((cur) => (cur.some((m) => m.id === event.message.id) ? cur : [event.message, ...cur]));
        api.post(markReadPath()).catch(() => {});
      }),
    [type, id, markReadPath]
  );

  // Edit/delete/reaction events only ever need to patch a message already
  // sitting in local state — unlike message.new above, there's nothing to
  // insert, so an existence check in the current thread's loaded page is
  // filter enough (a different open thread simply won't have the id).
  useEffect(
    () =>
      onChatEvent("message.edited", (event: any) => {
        const updated = event.message;
        setMessages((cur) => (cur.some((m) => m.id === updated.id) ? cur.map((m) => (m.id === updated.id ? updated : m)) : cur));
      }),
    []
  );

  useEffect(
    () =>
      onChatEvent("message.deleted", (event: any) => {
        const updated = event.message;
        setMessages((cur) => (cur.some((m) => m.id === updated.id) ? cur.map((m) => (m.id === updated.id ? updated : m)) : cur));
      }),
    []
  );

  useEffect(
    () =>
      onChatEvent("message.reaction", (event: any) => {
        setMessages((cur) =>
          cur.some((m) => m.id === event.message_id) ? cur.map((m) => (m.id === event.message_id ? applyReactionEvent(m, event, user?.id) : m)) : cur
        );
      }),
    [user?.id]
  );

  const loadOlder = async () => {
    if (loadingOlder || !page || page <= 1) return;
    setLoadingOlder(true);
    try {
      const res = await api.get(messagesPath(`?size=30&page=${page - 1}`));
      setMessages((cur) => [...cur, ...[...(res.messages || [])].reverse()]);
      setPage(res.page || null);
    } catch {
      // silent — a failed "load older" just leaves the list where it was
    } finally {
      setLoadingOlder(false);
    }
  };

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) setAttachment(result.assets[0]);
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !attachment) return;
    setSending(true);
    try {
      let message;
      if (attachment) {
        // fetch()+FormData breaks on Android ("Unsupported FormDataPart
        // implementation") — same issue Leave.tsx hit, same fix: route
        // through expo-file-system's native multipart upload.
        const token = await getToken();
        const result = await FileSystem.uploadAsync(`${BASE_URL}${sendPath()}`, attachment.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "attachment",
          mimeType: attachment.mimeType || "application/octet-stream",
          parameters: body ? { body } : {},
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (result.status < 200 || result.status >= 300) {
          throw new Error(JSON.parse(result.body || "{}")?.detail || "Could not send message");
        }
        message = JSON.parse(result.body);
      } else {
        message = await api.post(sendPath(), { body });
      }
      setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [message, ...cur]));
      setText("");
      setAttachment(null);
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const startEdit = (message: any) => {
    setEditingMessage(message);
    setText(message.body || "");
    setAttachment(null);
    closeSheet();
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
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const deleteMessageNow = async (message: any) => {
    try {
      const updated = await api.post(endpoints.messageDelete(message.id));
      setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
      if (editingMessage?.id === message.id) cancelEdit();
    } catch (err: any) {
      toast.show(err.message, "error");
    }
  };

  const confirmUnsend = (message: any) => {
    closeSheet();
    Alert.alert("Unsend this message?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unsend", style: "destructive", onPress: () => deleteMessageNow(message) },
    ]);
  };

  const react = async (message: any, emoji: string) => {
    try {
      const updated = await api.post(endpoints.messageReact(message.id), { emoji });
      setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err: any) {
      toast.show(err.message, "error");
    }
  };

  const openSheet = (message: any) => {
    setSheetMessage(message);
    setSheetMode("actions");
  };
  const closeSheet = () => setSheetMessage(null);

  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* "height" (not the usual "undefined") on Android — this screen is a
            full-screen Modal, and Android's windowSoftInputMode=adjustResize
            (what the rest of the app relies on for keyboard avoidance)
            doesn't reach into a Modal's separate native view hierarchy, so
            the composer gets hidden behind the keyboard without an explicit
            behavior here. */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
              <ChevronLeft size={18} color={T.ink} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {type === "channel" && (
              <Pressable
                onPress={() => setShowMembers(true)}
                hitSlop={8}
                style={styles.membersButton}
                accessibilityLabel="Channel members"
                accessibilityRole="button"
              >
                <Users size={15} color={T.tealDeep} />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={T.teal} />
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(m) => String(m.id)}
              inverted
              contentContainerStyle={styles.listContent}
              onEndReached={loadOlder}
              onEndReachedThreshold={0.4}
              ListFooterComponent={loadingOlder ? <ActivityIndicator style={styles.loadingOlder} color={T.teal} /> : null}
              renderItem={({ item }) => {
                const isSelf = item.sender?.id === user?.id;
                const deleted = !!item.is_deleted;
                return (
                  <View style={[styles.bubbleWrap, isSelf ? styles.bubbleWrapSelf : styles.bubbleWrapOther]}>
                    {!isSelf && (
                      <View style={styles.avatarSlot}>
                        <Avatar initials={initialsOf(item.sender)} size={26} src={mediaUrl(item.sender?.image)} />
                      </View>
                    )}
                    <View style={styles.bubbleRow}>
                      {type === "channel" && !isSelf && (
                        <Text style={styles.senderName}>
                          {item.sender ? `${item.sender.first_name} ${item.sender.last_name}` : "Unknown"}
                        </Text>
                      )}
                      <Pressable
                        onLongPress={() => !deleted && openSheet(item)}
                        delayLongPress={280}
                        style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther, deleted && styles.bubbleDeleted]}
                      >
                        {deleted ? (
                          <Text style={styles.bubbleTextDeleted}>This message was deleted</Text>
                        ) : (
                          <>
                            {!!item.body && <Text style={[styles.bubbleText, isSelf ? styles.bubbleTextSelf : styles.bubbleTextOther]}>{item.body}</Text>}
                            {!!item.attachment && (
                              <Pressable style={styles.attachmentRow} onPress={() => Linking.openURL(mediaUrl(item.attachment)!)}>
                                <Paperclip size={13} color={isSelf ? T.onAccent : T.navyDeep} />
                                <Text style={[styles.attachmentText, { color: isSelf ? T.onAccent : T.navyDeep }]}>Attachment</Text>
                              </Pressable>
                            )}
                          </>
                        )}
                      </Pressable>
                      {!deleted && item.reactions?.length > 0 && (
                        <View style={[styles.reactionsRow, isSelf ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
                          {item.reactions.map((r: any) => (
                            <Pressable
                              key={r.emoji}
                              onPress={() => react(item, r.emoji)}
                              style={[styles.reactionPill, r.reacted_by_me && styles.reactionPillActive]}
                            >
                              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                              <Text style={[styles.reactionCount, r.reacted_by_me && styles.reactionCountActive]}>{r.count}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <Text style={[styles.bubbleTime, isSelf ? { textAlign: "right" } : { textAlign: "left" }]}>
                        {timeOf(item.created_at)}
                        {!deleted && !!item.edited_at && <Text style={styles.editedTag}> · edited</Text>}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {attachment && !editingMessage && (
            <View style={styles.pendingAttachment}>
              <Paperclip size={13} color={T.muted} />
              <Text style={styles.pendingAttachmentText} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Pressable onPress={() => setAttachment(null)} hitSlop={8}>
                <Text style={styles.pendingAttachmentRemove}>Remove</Text>
              </Pressable>
            </View>
          )}

          {editingMessage && (
            <View style={styles.editBar}>
              <Pencil size={13} color={T.tealDeep} />
              <Text style={styles.editBarText} numberOfLines={1}>
                Editing message
              </Text>
              <Pressable onPress={cancelEdit} hitSlop={8} accessibilityLabel="Cancel edit" accessibilityRole="button">
                <X size={15} color={T.tealDeep} />
              </Pressable>
            </View>
          )}

          <View style={styles.composerRow}>
            {!editingMessage && (
              <Pressable onPress={pickAttachment} style={styles.attachButton} accessibilityLabel="Attach a file" accessibilityRole="button">
                <Paperclip size={16} color={T.muted} />
              </Pressable>
            )}
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={editingMessage ? "Edit message…" : "Message…"}
              placeholderTextColor={T.faint}
              multiline
            />
            <Pressable
              onPress={editingMessage ? submitEdit : send}
              disabled={sending || (!text.trim() && !attachment)}
              style={[styles.sendButton, { opacity: sending || (!text.trim() && !attachment) ? 0.5 : 1 }]}
              accessibilityLabel={editingMessage ? "Save edit" : "Send"}
              accessibilityRole="button"
            >
              {sending ? (
                <ActivityIndicator size="small" color={T.onAccent} />
              ) : editingMessage ? (
                <Check size={15} color={T.onAccent} />
              ) : (
                <Send size={15} color={T.onAccent} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {showMembers && type === "channel" && <ChannelMembersScreen channelId={id} onBack={() => setShowMembers(false)} />}

      <Modal visible={!!sheetMessage} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={styles.sheetPanel} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {sheetMode === "actions" ? (
              <>
                <Pressable
                  onPress={() => setSheetMode("react")}
                  style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                >
                  <SmilePlus size={18} color={T.ink} />
                  <Text style={styles.sheetRowText}>React</Text>
                </Pressable>
                {sheetMessage?.sender?.id === user?.id && (
                  <>
                    <Pressable
                      onPress={() => startEdit(sheetMessage)}
                      style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                    >
                      <Pencil size={18} color={T.ink} />
                      <Text style={styles.sheetRowText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmUnsend(sheetMessage)}
                      style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                    >
                      <Trash2 size={18} color={T.coral} />
                      <Text style={[styles.sheetRowText, styles.sheetRowTextDanger]}>Unsend</Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : (
              <View style={styles.emojiPickerRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      react(sheetMessage, emoji);
                      closeSheet();
                    }}
                    style={({ pressed }) => [styles.emojiPickerButton, pressed && styles.emojiPickerButtonPressed]}
                  >
                    <Text style={styles.emojiPickerEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
