import React from "react";
import { Clock, CalendarDays, FileText, LayoutGrid, TrendingUp, Users, Wallet } from "lucide-react-native";

import Today from "../screens/employee/Today";
import Shifts from "../screens/employee/Shifts";
import Leave from "../screens/employee/Leave";
import EmployeeWallet from "../screens/employee/Wallet";
import Overview from "../screens/manager/Overview";
import Roster from "../screens/manager/Roster";
import Payroll from "../screens/manager/Payroll";
import Reports from "../screens/manager/Reports";

// Ported from frontend/src/components/Sidebar.jsx's EMP_NAV/MGR_NAV — same
// keys/labels/icons, now also carrying the screen component directly
// (consumed by AppTabs.tsx's Tab.Navigator instead of custom rail/bar JSX).
// Moderators reuse MGR_NAV unchanged, same as the web app — in-page
// permission checks (isManager, billing.can_add_employees, etc.) still do
// the gating inside each screen, not the navigator.
export const EMP_NAV = [
  { key: "Today", label: "Today", icon: Clock, component: Today },
  { key: "Shifts", label: "My shifts", icon: CalendarDays, component: Shifts },
  { key: "Leave", label: "Leave", icon: FileText, component: Leave },
  { key: "Wallet", label: "Wallet", icon: Wallet, component: EmployeeWallet },
];

// Team and Approvals dropped as their own tabs — they now live inside
// Overview, switched via its in-screen segmented row (see Overview.tsx).
export const MGR_NAV = [
  { key: "Overview", label: "Overview", icon: LayoutGrid, component: Overview },
  { key: "Roster", label: "Roster", icon: CalendarDays, component: Roster },
  { key: "Payroll", label: "Payroll & Wallets", icon: Wallet, component: Payroll },
  { key: "Reports", label: "Reports", icon: TrendingUp, component: Reports },
];
