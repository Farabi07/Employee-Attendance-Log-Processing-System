import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BarChart3, ChevronRight, Receipt } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import Card from "../../components/Card";
import Reports from "./Reports";
import Expenses from "./Expenses";

type Destination = "reports" | "expenses" | null;

export default function More() {
  const T = useTheme();
  const [destination, setDestination] = useState<Destination>(null);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        content: { padding: 16, gap: 12 },
        eyebrow: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.tealDeep, textTransform: "uppercase", letterSpacing: 0.7 },
        title: { fontFamily: fonts.display.bold, fontSize: 24, color: T.ink, marginTop: 5 },
        subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, lineHeight: 19, marginTop: 5, marginBottom: 8 },
        item: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16 },
        icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: T.tealBg },
        itemText: { flex: 1 },
        itemTitle: { fontFamily: fonts.body.semibold, fontSize: 14, color: T.ink },
        itemBody: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginTop: 3 },
      }),
    [T]
  );

  if (destination === "reports") return <View style={styles.safe}><Reports /></View>;
  if (destination === "expenses") return <View style={styles.safe}><Expenses /></View>;

  return (
    <View style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Workspace</Text>
        <Text style={styles.title}>More tools</Text>
        <Text style={styles.subtitle}>Keep your primary navigation focused. Your reports and business finance tools are still one tap away.</Text>
        <Card style={{ padding: 0 }}>
          <Pressable style={styles.item} onPress={() => setDestination("reports")}>
            <View style={styles.icon}><BarChart3 size={20} color={T.tealDeep} /></View>
            <View style={styles.itemText}><Text style={styles.itemTitle}>Reports</Text><Text style={styles.itemBody}>Export attendance and timesheet data</Text></View>
            <ChevronRight size={18} color={T.faint} />
          </Pressable>
        </Card>
        <Card style={{ padding: 0 }}>
          <Pressable style={styles.item} onPress={() => setDestination("expenses")}>
            <View style={styles.icon}><Receipt size={20} color={T.tealDeep} /></View>
            <View style={styles.itemText}><Text style={styles.itemTitle}>Business finance</Text><Text style={styles.itemBody}>Track revenue, expenses and receipts</Text></View>
            <ChevronRight size={18} color={T.faint} />
          </Pressable>
        </Card>
      </View>
    </View>
  );
}
