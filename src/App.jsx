import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { T, fontDisplay, fontBody } from "./theme";
import { useAuth } from "./lib/auth";
import { useIsMobile } from "./lib/useMediaQuery";
import Sidebar, { EMP_NAV, MGR_NAV } from "./components/Sidebar";
import Avatar from "./components/Avatar";
import NotificationBell from "./components/NotificationBell";
import ProfileModal from "./components/ProfileModal";
import Login from "./pages/Login";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";

import EmployeeToday from "./pages/employee/Today";
import EmployeeShifts from "./pages/employee/Shifts";
import EmployeeLeave from "./pages/employee/Leave";

import ManagerOverview from "./pages/manager/Overview";
import ManagerTeam from "./pages/manager/Team";
import ManagerRoster from "./pages/manager/Roster";
import ManagerApprovals from "./pages/manager/Approvals";
import ManagerReports from "./pages/manager/Reports";

function parseResetPath() {
  const match = window.location.pathname.match(/^\/password\/reset\/confirm\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return { uid: decodeURIComponent(match[1]), token: decodeURIComponent(match[2]) };
}

function Shell() {
  const { user, isManager, logout } = useAuth();
  const role = isManager ? "manager" : "employee";
  const [active, setActive] = useState(role === "employee" ? "today" : "overview");
  const [showProfile, setShowProfile] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setActive(role === "employee" ? "today" : "overview");
  }, [role]);

  const initials = `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase();
  const title = role === "employee" ? EMP_NAV.find((n) => n.key === active)?.label : MGR_NAV.find((n) => n.key === active)?.label;

  return (
    <div style={{ fontFamily: fontBody, background: T.paper, minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar role={role} active={active} setActive={setActive} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "14px 16px" : "18px 28px",
            borderBottom: `1px solid ${T.line}`,
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontFamily: fontDisplay, fontSize: isMobile ? 16 : 19, fontWeight: 600, color: T.ink, margin: 0 }}>{title}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
            <NotificationBell />
            <button
              onClick={() => setShowProfile(true)}
              style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
              aria-label="Profile"
            >
              <Avatar initials={initials} size={34} />
              {!isMobile && (
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>
                    {user.first_name} {user.last_name}
                  </p>
                  <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.muted, margin: 0 }}>{isManager ? "Manager" : "Employee"}</p>
                </div>
              )}
            </button>
            <button
              onClick={logout}
              aria-label="Log out"
              style={{ border: `1px solid ${T.line}`, background: T.card, borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <LogOut size={15} color={T.muted} />
            </button>
          </div>
        </div>

        <div style={{ padding: isMobile ? "16px" : "24px 28px", paddingBottom: isMobile ? 76 : 24, overflowY: "auto", flex: 1, overflowX: "hidden" }}>
          {role === "employee" && active === "today" && <EmployeeToday />}
          {role === "employee" && active === "shifts" && <EmployeeShifts />}
          {role === "employee" && active === "leave" && <EmployeeLeave />}

          {role === "manager" && active === "overview" && <ManagerOverview />}
          {role === "manager" && active === "team" && <ManagerTeam />}
          {role === "manager" && active === "roster" && <ManagerRoster />}
          {role === "manager" && active === "approvals" && <ManagerApprovals />}
          {role === "manager" && active === "reports" && <ManagerReports />}
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [resetLink] = useState(parseResetPath);

  if (resetLink) {
    return (
      <ResetPasswordConfirm
        uid={resetLink.uid}
        token={resetLink.token}
        onDone={() => {
          window.history.replaceState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody, color: T.muted, background: T.paper }}>
        Loading…
      </div>
    );
  }

  return isAuthenticated ? <Shell /> : <Login />;
}
