import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Plus, X } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { api, mediaUrl } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useToast } from "../../components/Toast";
import { PrimaryButton } from "../../components/Button";
import Avatar from "../../components/Avatar";
import TeammatePickerList from "./TeammatePickerList";

function initialsOf(person: any) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
}

// Opened from ThreadScreen's header (channel threads only). Add/remove
// requires being a channel admin (the creator, by default) or an org
// manager/moderator — enforced server-side (chat/views/_access.py's
// require_channel_admin); this screen doesn't try to re-derive that rule
// client-side beyond hiding the controls for the common case, since the
// server is the actual source of truth.
export default function ChannelMembersScreen({ channelId, onBack }: { channelId: number; onBack: () => void }) {
  const T = useTheme();
  const toast = useToast();
  const { user, isManagerOrModerator } = useAuth();
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
        headerTitle: { flex: 1, fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink },
        addButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.tealBg },
        content: { padding: 16 },
        row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
        rowBorder: { borderTopWidth: 1, borderTopColor: T.line2 },
        rowText: { flex: 1, minWidth: 0 },
        rowName: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
        adminPill: { fontFamily: fonts.body.semibold, fontSize: 10.5, color: T.tealDeep },
        removeButton: { padding: 6 },
      }),
    [T]
  );

  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await api.get(endpoints.channelDetail(channelId));
    setChannel(res);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [channelId]);

  const myMembership = channel?.members?.find((m: any) => m.member.id === user?.id);
  const canManage = isManagerOrModerator || !!myMembership?.is_admin;

  const openAdd = async () => {
    setAdding(true);
    setSelectedIds([]);
    try {
      const res = await api.get(endpoints.teammatesAll());
      const memberIds = new Set((channel?.members || []).map((m: any) => m.member.id));
      setEmployees((res.employees || []).filter((e: any) => !memberIds.has(e.id)));
    } catch (err: any) {
      toast.show(err.message, "error");
    }
  };

  const toggle = (id: number) => setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const saveAdd = async () => {
    if (selectedIds.length === 0) {
      setAdding(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.post(endpoints.channelAddMembers(channelId), { member_ids: selectedIds });
      setChannel(updated);
      setAdding(false);
      toast.show("Members added.");
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: number) => {
    try {
      const updated = await api.post(endpoints.channelRemoveMember(channelId), { member_id: memberId });
      setChannel(updated);
    } catch (err: any) {
      toast.show(err.message, "error");
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={() => (adding ? setAdding(false) : onBack())}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (adding ? setAdding(false) : onBack())}
            hitSlop={8}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft size={18} color={T.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{adding ? "Add members" : "Members"}</Text>
          {!adding && canManage && (
            <Pressable onPress={openAdd} hitSlop={8} style={styles.addButton} accessibilityLabel="Add members" accessibilityRole="button">
              <Plus size={16} color={T.tealDeep} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={T.teal} />
          </View>
        ) : adding ? (
          <>
            <ScrollView contentContainerStyle={styles.content}>
              <TeammatePickerList employees={employees} selectedIds={selectedIds} onToggle={toggle} />
            </ScrollView>
            <View style={{ padding: 16 }}>
              <PrimaryButton
                title={saving ? "Adding…" : `Add${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
                onPress={saveAdd}
                disabled={saving || selectedIds.length === 0}
                loading={saving}
              />
            </View>
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {channel?.is_public && (
              <Text style={{ fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 12 }}>
                Public channel — everyone in your organization can see it. This list only shows who's actually opened it so far.
              </Text>
            )}
            {(channel?.members || []).map((m: any, i: number) => (
              <View key={m.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Avatar initials={initialsOf(m.member)} size={34} src={mediaUrl(m.member.image)} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>
                    {m.member.first_name} {m.member.last_name}
                  </Text>
                  {m.is_admin && <Text style={styles.adminPill}>Admin</Text>}
                </View>
                {canManage && m.member.id !== user?.id && (
                  <Pressable onPress={() => removeMember(m.member.id)} style={styles.removeButton} hitSlop={8} accessibilityLabel="Remove member" accessibilityRole="button">
                    <X size={16} color={T.coral} />
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
