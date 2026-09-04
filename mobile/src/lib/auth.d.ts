import type { ReactNode } from "react";

// Lightweight type declaration for auth.jsx (kept as plain JS since it's a
// close port of frontend/src/lib/auth.jsx) — just enough for TS's strict
// mode to type-check every useAuth() call site correctly.
export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  org_role?: "manager" | "moderator" | "employee";
  is_admin?: boolean;
  organization?: number | null;
  image?: string | null;
  [key: string]: unknown;
}

export interface BillingStatus {
  has_active_access: boolean;
  currency?: string;
  can_add_employees?: boolean;
  can_manage_qr?: boolean;
  can_manage_subscription?: boolean;
  moderator_can_add_employees?: boolean;
  moderator_can_manage_qr?: boolean;
  moderator_can_manage_subscription?: boolean;
  organization_name?: string;
  subscription_status?: "trialing" | "active" | "past_due" | "canceled";
  trial_ends_at?: string;
  [key: string]: unknown;
}

export interface AuthContextValue {
  user: AuthUser | null;
  billing: BillingStatus | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (payload: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  refreshBilling: () => Promise<void>;
  isAuthenticated: boolean;
  isPlatformOwner: boolean;
  isManager: boolean;
  isModerator: boolean;
  isManagerOrModerator: boolean;
}

export function AuthProvider(props: { children: ReactNode }): JSX.Element;
export function useAuth(): AuthContextValue;
