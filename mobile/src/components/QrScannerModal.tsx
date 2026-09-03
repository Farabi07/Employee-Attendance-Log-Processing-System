import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { X, KeyRound } from "lucide-react-native";
import { T, fonts } from "../theme";
import Card from "./Card";

// Ported from frontend/src/components/QrScannerModal.jsx. html5-qrcode's
// browser getUserMedia scanner becomes expo-camera's CameraView with
// built-in barcode scanning — same two capabilities (camera scan + manual
// 6-digit fallback), same "fire once per open scan session" guard (the web
// version used a `cancelled` flag in its effect cleanup; here a ref does
// the same job against onBarcodeScanned firing repeatedly while the modal
// is still open).
export default function QrScannerModal({
  title,
  onClose,
  onToken,
}: {
  title: string;
  onClose: () => void;
  onToken: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualToken, setManualToken] = useState("");
  const firedRef = useRef(false);

  // Auto-prompt on open, same as the web version's Html5Qrcode.start()
  // implicitly triggering the browser's camera permission dialog.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  const handleScanned = (result: { data: string }) => {
    if (firedRef.current) return;
    firedRef.current = true;
    onToken(result.data);
  };

  const submitManual = () => {
    if (!manualToken.trim() || firedRef.current) return;
    firedRef.current = true;
    onToken(manualToken.trim());
  };

  const cameraReady = permission?.granted;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={T.muted} />
            </Pressable>
          </View>

          <View style={styles.cameraBox}>
            {cameraReady ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleScanned}
              />
            ) : (
              <View style={styles.permissionPrompt}>
                <Text style={styles.permissionText}>
                  {permission?.canAskAgain === false
                    ? "Camera access was denied — enable it in Settings, or enter the code manually below."
                    : "Camera access is needed to scan the check-in QR code."}
                </Text>
                {permission?.canAskAgain !== false && (
                  <Pressable onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Allow camera</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={styles.manualSection}>
            <View style={styles.manualLabelRow}>
              <KeyRound size={13} color={T.muted} />
              <Text style={styles.manualLabel}>No camera? Type the current 6-digit code</Text>
            </View>
            <View style={styles.manualRow}>
              <TextInput
                value={manualToken}
                onChangeText={setManualToken}
                placeholder="e.g. 482913"
                keyboardType="number-pad"
                placeholderTextColor={T.faint}
                style={styles.manualInput}
              />
              <Pressable onPress={submitManual} style={styles.useButton}>
                <Text style={styles.useButtonText}>Use</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(22,35,58,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: { width: "100%", maxWidth: 360, padding: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink },
  cameraBox: {
    width: "100%",
    height: 240,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: T.line2,
  },
  permissionPrompt: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 12 },
  permissionText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, textAlign: "center" },
  permissionButton: { backgroundColor: T.ink, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8 },
  permissionButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  manualSection: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: T.line2 },
  manualLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  manualLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted },
  manualRow: { flexDirection: "row", gap: 8 },
  manualInput: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.mono.regular,
    fontSize: 12.5,
    color: T.ink,
  },
  useButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.ink, alignItems: "center", justifyContent: "center" },
  useButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
});
