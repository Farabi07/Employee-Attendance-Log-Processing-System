import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { X, Camera, Eye, EyeOff } from "lucide-react-native";
import { T, fonts } from "../theme";
import { useAuth } from "../lib/auth";
import { api, mediaUrl, BASE_URL, getToken } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import Avatar from "./Avatar";
import { PrimaryButton, TextButton } from "./Button";
import AccountDeletion from "../screens/settings/AccountDeletion";

// Ported from frontend/src/components/ProfileModal.jsx, plus a
// "Delete account" entry point (new, Apple-required — see
// screens/settings/AccountDeletion.tsx) swapped in within the same Modal.
// Photo picking reuses expo-document-picker (already a dependency for
// pay-adjustment attachments) filtered to images, rather than adding
// expo-image-picker as a new native module — that would need a fresh
// native build instead of shipping over OTA.
export default function ProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, isManager, isManagerOrModerator, logout, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pickedImage, setPickedImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!visible || !user) return;
    api.get(endpoints.profileMe()).then((res) => {
      setProfile(res);
      setFirstName(res.first_name || "");
      setLastName(res.last_name || "");
      setPhone(res.primary_phone || "");
      setAddress(res.street_address_one || "");
    });
  }, [visible, user]);

  if (!user) return null;
  const initials = `${(firstName || user.first_name || "?")[0]}${(lastName || user.last_name || "?")[0]}`.toUpperCase();
  const roleLabel = isManager ? "Manager" : isManagerOrModerator ? "Moderator" : "Employee";
  const avatarSrc = pickedImage?.uri || mediaUrl(profile?.image);

  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });
    if (!result.canceled) setPickedImage(result.assets[0]);
  };

  const saveProfile = async () => {
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      const fields: Record<string, string> = { first_name: firstName, last_name: lastName };
      if (phone) fields.primary_phone = phone;
      if (address) fields.street_address_one = address;

      let res;
      if (pickedImage) {
        // React Native's Android networking layer throws "Unsupported
        // FormDataPart implementation" for a plain fetch()+FormData body
        // (both PUT and POST — it's not method-specific). expo-file-system's
        // uploadAsync drives multipart through native code instead of the
        // JS FormData bridge, so it doesn't hit that bug.
        const token = await getToken();
        const result = await FileSystem.uploadAsync(`${BASE_URL}${endpoints.profileUpdate()}`, pickedImage.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "image",
          mimeType: pickedImage.mimeType || "image/jpeg",
          parameters: fields,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (result.status < 200 || result.status >= 300) {
          throw new Error(JSON.parse(result.body || "{}")?.detail || "Could not update profile");
        }
        res = JSON.parse(result.body);
      } else {
        // No photo change — plain JSON, no FormData involved at all.
        res = await api.post(endpoints.profileUpdate(), fields);
      }
      setProfile(res);
      setPickedImage(null);
      setProfileMessage({ type: "success", text: "Profile updated." });
      await refreshUser();
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmit = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserSetPassword(), { current_password: currentPassword, new_password: newPassword });
      setMessage({ type: "success", text: "Password updated. Please log in again." });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(logout, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => (showDeleteAccount ? setShowDeleteAccount(false) : onClose())}
    >
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          {showDeleteAccount ? (
            <AccountDeletion onBack={() => setShowDeleteAccount(false)} />
          ) : (
            <>
          <View style={styles.headerRow}>
            <View style={styles.identityRow}>
              <View>
                <Avatar initials={initials} size={48} src={avatarSrc} />
                <Pressable onPress={pickImage} style={styles.cameraButton} hitSlop={6}>
                  <Camera size={11} color="#fff" />
                </Pressable>
              </View>
              <View>
                <Text style={styles.name}>
                  {firstName || user.first_name} {lastName || user.last_name}
                </Text>
                <Text style={styles.email}>{user.email}</Text>
                <Text style={styles.role}>{roleLabel}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={T.muted} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edit profile</Text>
            <View style={styles.nameRow}>
              <TextInput
                placeholder="First name"
                placeholderTextColor={T.faint}
                value={firstName}
                onChangeText={setFirstName}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                placeholder="Last name"
                placeholderTextColor={T.faint}
                value={lastName}
                onChangeText={setLastName}
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            <TextInput placeholder="Phone" placeholderTextColor={T.faint} value={phone} onChangeText={setPhone} style={styles.input} />
            <TextInput placeholder="Address" placeholderTextColor={T.faint} value={address} onChangeText={setAddress} style={styles.input} />
            <PrimaryButton title={savingProfile ? "Saving…" : "Save profile"} onPress={saveProfile} loading={savingProfile} />
            {profileMessage && (
              <Text style={[styles.messageText, { color: profileMessage.type === "error" ? T.coral : T.teal }]}>
                {profileMessage.text}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change password</Text>
            <View style={styles.passwordInputWrap}>
              <TextInput
                secureTextEntry={!showCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={T.faint}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={[styles.input, styles.inputWithIcon]}
              />
              <Pressable onPress={() => setShowCurrentPassword((s) => !s)} style={styles.eyeButton} hitSlop={8}>
                {showCurrentPassword ? <EyeOff size={16} color={T.faint} /> : <Eye size={16} color={T.faint} />}
              </Pressable>
            </View>
            <View style={styles.passwordInputWrap}>
              <TextInput
                secureTextEntry={!showNewPassword}
                placeholder="New password"
                placeholderTextColor={T.faint}
                value={newPassword}
                onChangeText={setNewPassword}
                style={[styles.input, styles.inputWithIcon]}
              />
              <Pressable onPress={() => setShowNewPassword((s) => !s)} style={styles.eyeButton} hitSlop={8}>
                {showNewPassword ? <EyeOff size={16} color={T.faint} /> : <Eye size={16} color={T.faint} />}
              </Pressable>
            </View>
            <PrimaryButton
              title={submitting ? "Updating…" : "Update password"}
              onPress={handleSubmit}
              loading={submitting}
              disabled={!currentPassword || !newPassword}
            />
            {message && (
              <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>{message.text}</Text>
            )}
          </View>

          <View style={styles.deleteAccountRow}>
            <TextButton title="Delete account" onPress={() => setShowDeleteAccount(true)} color={T.coral} />
          </View>
            </>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(22,35,58,0.55)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 360, padding: 22, maxHeight: "88%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cameraButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: T.card,
    backgroundColor: T.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.ink },
  email: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted },
  role: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginTop: 2 },
  section: { borderTopWidth: 1, borderTopColor: T.line2, paddingTop: 16, marginBottom: 4 },
  sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 13.5, color: T.ink, marginBottom: 12 },
  nameRow: { flexDirection: "row", gap: 8 },
  input: {
    width: "100%",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: T.ink,
    marginBottom: 10,
  },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12, marginTop: 10, textAlign: "center" },
  deleteAccountRow: { marginTop: 16, alignItems: "center" },
  passwordInputWrap: { position: "relative", justifyContent: "center" },
  inputWithIcon: { paddingRight: 40 },
  eyeButton: { position: "absolute", right: 10, top: 9 },
});
