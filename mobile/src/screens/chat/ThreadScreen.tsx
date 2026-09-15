import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ChevronLeft, Users, Paperclip, Send } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { api, BASE_URL, getToken, mediaUrl } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { on as onChatEvent } from "../../lib/chatSocket";
import { useToast } from "../../components/Toast";
import ChannelMembersScreen from "./ChannelMembersScreen";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
        bubbleRow: { maxWidth: "82%" },
        bubbleRowSelf: { alignSelf: "flex-end" },
        bubbleRowOther: { alignSelf: "flex-start" },
        senderName: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.muted, marginBottom: 3, marginLeft: 4 },
        bubble: { borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
        bubbleSelf: { backgroundColor: T.teal, borderBottomRightRadius: 4 },
        bubbleOther: { backgroundColor: T.card, borderBottomLeftRadius: 4 },
        bubbleText: { fontFamily: fonts.body.regular, fontSize: 13.5 },
        bubbleTextSelf: { color: T.onAccent },
        bubbleTextOther: { color: T.ink },
        attachmentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
        attachmentText: { fontFamily: fonts.body.medium, fontSize: 12.5, textDecorationLine: "underline" },
        bubbleTime: { fontFamily: fonts.body.regular, fontSize: 10, color: T.faint, marginTop: 3, marginHorizontal: 4 },
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
                return (
                  <View style={[styles.bubbleRow, isSelf ? styles.bubbleRowSelf : styles.bubbleRowOther]}>
                    {type === "channel" && !isSelf && (
                      <Text style={styles.senderName}>
                        {item.sender ? `${item.sender.first_name} ${item.sender.last_name}` : "Unknown"}
                      </Text>
                    )}
                    <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
                      {!!item.body && <Text style={[styles.bubbleText, isSelf ? styles.bubbleTextSelf : styles.bubbleTextOther]}>{item.body}</Text>}
                      {!!item.attachment && (
                        <Pressable style={styles.attachmentRow} onPress={() => Linking.openURL(mediaUrl(item.attachment)!)}>
                          <Paperclip size={13} color={isSelf ? T.onAccent : T.navyDeep} />
                          <Text style={[styles.attachmentText, { color: isSelf ? T.onAccent : T.navyDeep }]}>Attachment</Text>
                        </Pressable>
                      )}
                    </View>
                    <Text style={[styles.bubbleTime, isSelf ? { textAlign: "right" } : { textAlign: "left" }]}>{timeOf(item.created_at)}</Text>
                  </View>
                );
              }}
            />
          )}

          {attachment && (
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

          <View style={styles.composerRow}>
            <Pressable onPress={pickAttachment} style={styles.attachButton} accessibilityLabel="Attach a file" accessibilityRole="button">
              <Paperclip size={16} color={T.muted} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message…"
              placeholderTextColor={T.faint}
              multiline
            />
            <Pressable
              onPress={send}
              disabled={sending || (!text.trim() && !attachment)}
              style={[styles.sendButton, { opacity: sending || (!text.trim() && !attachment) ? 0.5 : 1 }]}
              accessibilityLabel="Send"
              accessibilityRole="button"
            >
              {sending ? <ActivityIndicator size="small" color={T.onAccent} /> : <Send size={15} color={T.onAccent} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {showMembers && type === "channel" && <ChannelMembersScreen channelId={id} onBack={() => setShowMembers(false)} />}
    </Modal>
  );
}
