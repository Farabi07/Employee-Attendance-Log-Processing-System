import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Search, Check } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import Avatar from "../../components/Avatar";
import EmptyState from "../../components/EmptyState";

function initialsOf(person: any) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
}

// Shared by CreateChannelScreen (multi-select members), ChannelMembersScreen
// (multi-select to add) and NewDirectMessageScreen (single-select) — same
// search-then-tap-a-row list in all three, just with/without a checkbox.
export default function TeammatePickerList({
  employees,
  selectedIds,
  onToggle,
  multi = true,
}: {
  employees: any[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  multi?: boolean;
}) {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        searchBox: { position: "relative", marginBottom: 12 },
        searchIcon: { position: "absolute", left: 12, top: 12, zIndex: 1 },
        searchInput: {
          paddingVertical: 10,
          paddingLeft: 34,
          paddingRight: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: T.line,
          fontFamily: fonts.body.regular,
          fontSize: 13.5,
          color: T.ink,
          backgroundColor: T.card,
        },
        row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
        rowBorder: { borderTopWidth: 1, borderTopColor: T.line2 },
        rowText: { flex: 1, minWidth: 0 },
        rowName: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
        rowEmail: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginTop: 1 },
        checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: T.line, alignItems: "center", justifyContent: "center" },
        checkCircleActive: { borderColor: T.teal, backgroundColor: T.teal },
      }),
    [T]
  );

  const [query, setQuery] = useState("");
  const filtered = employees.filter((e) => `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <View>
      <View style={styles.searchBox}>
        <Search size={14} color={T.faint} style={styles.searchIcon} />
        <TextInput
          placeholder="Search teammates"
          placeholderTextColor={T.faint}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const selected = selectedIds.includes(item.id);
            return (
              <Pressable onPress={() => onToggle(item.id)} style={[styles.row, index > 0 && styles.rowBorder]}>
                <Avatar initials={initialsOf(item)} size={34} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text style={styles.rowEmail} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                {multi ? (
                  <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
                    {selected && <Check size={13} color={T.onAccent} strokeWidth={3} />}
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
