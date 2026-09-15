import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Hash, MessageCircle, Plus, Users } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { connect as connectChatSocket, disconnect as disconnectChatSocket, on as onChatEvent } from "../../lib/chatSocket";
import Card from "../../components/Card";
import IconChip from "../../components/IconChip";
import Avatar from "../../components/Avatar";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { tapLight } from "../../lib/haptics";
import ThreadScreen from "./ThreadScreen";
import CreateChannelScreen from "./CreateChannelScreen";
import NewDirectMessageScreen from "./NewDirectMessageScreen";

function timeAgo(iso?: string) {
  if (!iso) return "";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function previewOf(message: any) {
  if (!message) return "No messages yet";
  if (message.body) return message.body;
  return message.attachment ? "Sent an attachment" : "";
}

type Tab = "channels" | "direct";
type Selected = { type: "channel" | "dm"; id: number; title: string } | null;

// New "Chat" tab (see navigation/navConfig.tsx) — Slack-like direct
// messages and invite-only channels. Managers/moderators can create
// channels and manage membership; any org member can start a DM. There's
// no in-tab stack navigator anywhere else in this app (see AppTabs.tsx),
// so drilling into a thread or a creation flow follows the same
// full-screen Modal pattern AccountMenu.tsx already uses, instead of
// introducing a new navigation pattern just for chat.
export default function ChatListScreen() {
  const T = useTheme();
  const { isManagerOrModerator } = useAuth();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        headerRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 10 },
        tabs: { flex: 1, flexDirection: "row", gap: 6 },
        tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 9, backgroundColor: T.line2 },
        tabBtnActive: { backgroundColor: T.tealBg },
        tabText: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.muted },
        tabTextActive: { color: T.tealDeep },
        addButton: {
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: T.teal,
        },
        listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
        row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
        rowText: { flex: 1, minWidth: 0 },
        rowNameLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
        rowName: { fontFamily: fonts.body.semibold, fontSize: 14, color: T.ink, flexShrink: 1 },
        rowTime: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint },
        rowPreviewLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
        rowPreview: { flex: 1, fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
        rowPreviewUnread: { color: T.ink, fontFamily: fonts.body.medium },
        unreadBadge: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: T.coral, alignItems: "center", justifyContent: "center" },
        unreadBadgeText: { fontFamily: fonts.body.semibold, fontSize: 10.5, color: "#fff" },
        emptyWrap: { paddingTop: 30, paddingHorizontal: 16 },
      }),
    [T]
  );

  const [tab, setTab] = useState<Tab>("channels");
  const [channels, setChannels] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);

  const load = useCallback(async () => {
    const [channelsRes, conversationsRes] = await Promise.all([
      api.get(endpoints.channelsMine("?size=100")),
      api.get(endpoints.conversationsMine("?size=100")),
    ]);
    setChannels(channelsRes.channels || []);
    setConversations(conversationsRes.conversations || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Real-time delivery: a socket connection is shared across every screen
  // that imports lib/chatSocket.js (connect()/disconnect() are idempotent),
  // opened here since this tab is the natural "chat is in use" boundary.
  // Any event just triggers a reload rather than patching list state
  // in-place — chat activity here is infrequent enough that refetching is
  // simpler and can't drift out of sync with the server.
  useEffect(() => {
    connectChatSocket();
    const unsubs = [
      onChatEvent("message.new", load),
      onChatEvent("channel.created", load),
      onChatEvent("channel.member_added", load),
      onChatEvent("channel.member_removed", load),
    ];
    return () => {
      unsubs.forEach((unsub) => unsub());
      disconnectChatSocket();
    };
  }, [load]);

  const onRefresh = async () => {
    tapLight();
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const openChannel = (channel: any) => setSelected({ type: "channel", id: channel.id, title: channel.name });
  const openConversation = (conversation: any) => {
    const other = conversation.other_participant;
    const title = other ? `${other.first_name} ${other.last_name}` : "Direct message";
    setSelected({ type: "dm", id: conversation.id, title });
  };

  const initialsOf = (person: any) => `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.headerRow}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab("channels")} style={[styles.tabBtn, tab === "channels" && styles.tabBtnActive]}>
            <Hash size={14} color={tab === "channels" ? T.tealDeep : T.muted} />
            <Text style={[styles.tabText, tab === "channels" && styles.tabTextActive]}>Channels</Text>
          </Pressable>
          <Pressable onPress={() => setTab("direct")} style={[styles.tabBtn, tab === "direct" && styles.tabBtnActive]}>
            <MessageCircle size={14} color={tab === "direct" ? T.tealDeep : T.muted} />
            <Text style={[styles.tabText, tab === "direct" && styles.tabTextActive]}>Direct</Text>
          </Pressable>
        </View>
        {(tab === "direct" || isManagerOrModerator) && (
          <Pressable
            onPress={() => {
              tapLight();
              if (tab === "channels") setShowCreateChannel(true);
              else setShowNewDM(true);
            }}
            style={styles.addButton}
            accessibilityLabel={tab === "channels" ? "New channel" : "New direct message"}
            accessibilityRole="button"
          >
            <Plus size={18} color={T.onAccent} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={62} radius={14} />
          ))}
        </View>
      ) : tab === "channels" ? (
        channels.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={Hash}
              title="No channels yet"
              subtitle={isManagerOrModerator ? "Create one and add your team." : "Your manager hasn't added you to a channel yet."}
            />
          </View>
        ) : (
          <FlatList
            data={channels}
            keyExtractor={(c) => String(c.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} colors={[T.teal]} />}
            renderItem={({ item }) => {
              const unread = item.unread_count > 0;
              return (
                <Card style={{ padding: 0 }}>
                  <Pressable onPress={() => openChannel(item)} style={styles.row}>
                    <IconChip bg={T.tealBg} size={40}>
                      <Hash size={18} color={T.tealDeep} />
                    </IconChip>
                    <View style={styles.rowText}>
                      <View style={styles.rowNameLine}>
                        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.rowTime}>{timeAgo(item.last_message?.created_at || item.updated_at)}</Text>
                      </View>
                      <View style={styles.rowPreviewLine}>
                        <Text style={[styles.rowPreview, unread && styles.rowPreviewUnread]} numberOfLines={1}>
                          {previewOf(item.last_message)}
                        </Text>
                        {unread && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{item.unread_count > 9 ? "9+" : item.unread_count}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </Card>
              );
            }}
          />
        )
      ) : conversations.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon={Users} title="No conversations yet" subtitle="Start a direct message with a teammate." />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} colors={[T.teal]} />}
          renderItem={({ item }) => {
            const other = item.other_participant;
            const unread = item.unread_count > 0;
            return (
              <Card style={{ padding: 0 }}>
                <Pressable onPress={() => openConversation(item)} style={styles.row}>
                  <Avatar initials={initialsOf(other)} size={40} />
                  <View style={styles.rowText}>
                    <View style={styles.rowNameLine}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {other ? `${other.first_name} ${other.last_name}` : "Direct message"}
                      </Text>
                      <Text style={styles.rowTime}>{timeAgo(item.last_message?.created_at || item.created_at)}</Text>
                    </View>
                    <View style={styles.rowPreviewLine}>
                      <Text style={[styles.rowPreview, unread && styles.rowPreviewUnread]} numberOfLines={1}>
                        {previewOf(item.last_message)}
                      </Text>
                      {unread && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{item.unread_count > 9 ? "9+" : item.unread_count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              </Card>
            );
          }}
        />
      )}

      {selected && (
        <ThreadScreen
          type={selected.type}
          id={selected.id}
          title={selected.title}
          onBack={() => {
            setSelected(null);
            load();
          }}
        />
      )}

      {showCreateChannel && (
        <CreateChannelScreen
          onBack={() => setShowCreateChannel(false)}
          onCreated={() => {
            setShowCreateChannel(false);
            load();
          }}
        />
      )}

      {showNewDM && (
        <NewDirectMessageScreen
          onBack={() => setShowNewDM(false)}
          onStarted={(conversation) => {
            setShowNewDM(false);
            openConversation(conversation);
            load();
          }}
        />
      )}
    </SafeAreaView>
  );
}
