import React, { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { useAuth } from "../lib/auth";
import { api, BASE_URL } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import Avatar from "./Avatar";

export default function ProfileModal({ onClose }) {
  const { user, isManager, logout, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(endpoints.profileMe()).then((res) => {
      setProfile(res);
      setFirstName(res.first_name || "");
      setLastName(res.last_name || "");
      setPhone(res.primary_phone || "");
      setAddress(res.street_address_one || "");
    });
  }, []);

  const initials = `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();
  const avatarSrc = imagePreview || (profile?.image ? `${BASE_URL}${profile.image}` : undefined);

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      const form = new FormData();
      form.append("first_name", firstName);
      form.append("last_name", lastName);
      if (phone) form.append("primary_phone", phone);
      if (address) form.append("street_address_one", address);
      if (imageFile) form.append("image", imageFile);
      const res = await api.put(endpoints.profileUpdate(), form);
      setProfile(res);
      setImageFile(null);
      setProfileMessage({ type: "success", text: "Profile updated." });
      await refreshUser();
    } catch (err) {
      setProfileMessage({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserSetPassword(), { current_password: currentPassword, new_password: newPassword });
      setMessage({ type: "success", text: "Password updated. Please log in again." });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(logout, 1500);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, marginBottom: 10, boxSizing: "border-box" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(22,35,58,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <Card style={{ width: "min(380px, 92vw)", padding: "24px 22px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Avatar initials={initials} size={52} src={avatarSrc} />
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change photo"
                style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", border: `2px solid ${T.card}`, background: T.teal, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Camera size={11} color="#fff" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} />
            </div>
            <div>
              <p style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: 0 }}>
                {firstName} {lastName}
              </p>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: 0 }}>{user.email}</p>
              <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.faint, margin: "2px 0 0" }}>{isManager ? "Manager" : "Employee"}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Close">
            <X size={18} color={T.muted} />
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${T.line2}`, paddingTop: 16, marginBottom: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 13.5, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>Edit profile</h3>
          <form onSubmit={saveProfile}>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
            <button
              type="submit"
              disabled={savingProfile}
              style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: T.teal, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: savingProfile ? 0.7 : 1 }}
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
            {profileMessage && (
              <p style={{ fontFamily: fontBody, fontSize: 12, color: profileMessage.type === "error" ? T.coral : T.teal, marginTop: 10, textAlign: "center" }}>
                {profileMessage.text}
              </p>
            )}
          </form>
        </div>

        <div style={{ borderTop: `1px solid ${T.line2}`, paddingTop: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 13.5, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>Change password</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              required
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              required
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
            {message && (
              <p style={{ fontFamily: fontBody, fontSize: 12, color: message.type === "error" ? T.coral : T.teal, marginTop: 10, textAlign: "center" }}>
                {message.text}
              </p>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
