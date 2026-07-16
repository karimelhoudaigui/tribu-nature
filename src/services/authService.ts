export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    name?: string;
    avatar_url?: string;
  };
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
};

export type UserProfileRecord = {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  avatar_path?: string | null;
  city: string | null;
  bio: string | null;
  age_range?: string | null;
  verified?: boolean | null;
  physical_level?: string | null;
  budget_range?: string | null;
  adventure_style?: string | null;
  preferred_ambiences?: string[] | null;
  safety_preferences?: string[] | null;
  past_trips?: number | null;
  badges?: string[] | null;
  is_seed_profile?: boolean | null;
  last_seen_at?: string | null;
  preferred_language?: string | null;
  app_onboarding_status?: "not_started" | "in_progress" | "completed" | "skipped";
  app_onboarding_started_at?: string | null;
  app_onboarding_completed_at?: string | null;
  app_onboarding_skipped_at?: string | null;
  app_onboarding_last_step?: number | null;
  account_status?: "active" | "disabled" | "deleted";
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserProfileUpdate = Partial<Pick<
  UserProfileRecord,
  | "display_name"
  | "avatar_url"
  | "avatar_path"
  | "city"
  | "bio"
  | "age_range"
  | "physical_level"
  | "budget_range"
  | "adventure_style"
  | "preferred_ambiences"
  | "safety_preferences"
  | "past_trips"
  | "badges"
  | "preferred_language"
  | "app_onboarding_status"
  | "app_onboarding_started_at"
  | "app_onboarding_completed_at"
  | "app_onboarding_skipped_at"
  | "app_onboarding_last_step"
>>;

type AuthApiResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: AuthUser;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authStorageKey = "tripeer_auth_session";
const legacyAuthStorageKey = "tribu_nature_auth_session";

export function hasSupabaseAuthConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthSession | null> {
  ensureAuthConfig();

  const body = await requestAuth<AuthApiResponse>("signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: {
        display_name: displayName.trim()
      }
    })
  });
  const session = normalizeSession(body);

  if (session) {
    storeSession(session);
    await upsertCurrentProfile(session, displayName);
  }

  return session;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  ensureAuthConfig();

  const body = await requestAuth<AuthApiResponse>("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  const session = normalizeSession(body);

  if (!session) {
    throw new Error("Connexion impossible. Vérifie ton email et ton mot de passe.");
  }

  storeSession(session);
  try {
    await upsertCurrentProfile(session);
    return session;
  } catch (error) {
    clearStoredSession();
    throw error;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  ensureAuthConfig();
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}${window.location.pathname}`;
  await requestAuth<Record<string, never>>("recover", {
    method: "POST",
    body: JSON.stringify({ email, ...(redirectTo ? { redirect_to: redirectTo } : {}) })
  });
}

export async function getPasswordRecoverySessionFromUrl(): Promise<AuthSession | null> {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get("type") !== "recovery" || !params.get("access_token")) return null;

  const accessToken = params.get("access_token") ?? "";
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, { headers: getAuthHeaders(accessToken) });
  if (!response.ok) throw new Error(`Lien de récupération invalide ou expiré : ${await getErrorMessage(response)}`);
  const user = await response.json() as AuthUser;
  const expiresIn = Number(params.get("expires_in") ?? 3600);
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: params.get("refresh_token") ?? undefined,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user
  };
  storeSession(session);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return session;
}

export async function signOut(accessToken?: string) {
  if (hasSupabaseAuthConfig() && accessToken) {
    try {
      await fetch(`${getSupabaseUrl()}/auth/v1/logout`, {
        method: "POST",
        headers: getAuthHeaders(accessToken)
      });
    } catch (error) {
      console.warn("Déconnexion Supabase distante impossible.", error);
    }
  }
  clearStoredSession();
}

export async function getStoredSession(): Promise<AuthSession | null> {
  const session = readStoredSession();
  if (!session) return null;

  if (session.expires_at && session.expires_at * 1000 < Date.now() + 30_000 && session.refresh_token) {
    try {
      return await refreshSession(session.refresh_token);
    } catch (error) {
      console.warn("Session expirée, reconnexion nécessaire.", error);
      clearStoredSession();
      return null;
    }
  }

  return session;
}

export async function getCurrentProfile(session: AuthSession): Promise<UserProfileRecord> {
  ensureAuthConfig();

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=*&limit=1`, {
    headers: getRestHeaders(session.access_token)
  });

  if (!response.ok) {
    throw new Error(`Profil introuvable: ${await getErrorMessage(response)}`);
  }

  const rows = (await response.json()) as UserProfileRecord[];
  if (rows[0]?.account_status && rows[0].account_status !== "active") {
    throw new Error("Ce compte a été désactivé. Contacte le support si tu souhaites le réactiver.");
  }
  if (rows[0]) return rows[0];

  return upsertCurrentProfile(session);
}

export async function getProfileById(profileId: string, accessToken: string): Promise<UserProfileRecord | null> {
  ensureAuthConfig();

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/public_profiles?id=eq.${encodeURIComponent(profileId)}&select=*&limit=1`, {
    headers: getRestHeaders(accessToken)
  });

  if (!response.ok) {
    throw new Error(`Profil introuvable: ${await getErrorMessage(response)}`);
  }

  const rows = (await response.json()) as UserProfileRecord[];
  return rows[0] ?? null;
}

export async function getProfilesByIds(profileIds: string[], accessToken: string): Promise<UserProfileRecord[]> {
  ensureAuthConfig();

  const uniqueIds = [...new Set(profileIds)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/public_profiles?id=in.(${uniqueIds.map(encodeURIComponent).join(",")})&select=*`, {
    headers: getRestHeaders(accessToken)
  });

  if (!response.ok) {
    throw new Error(`Profils introuvables: ${await getErrorMessage(response)}`);
  }

  return response.json() as Promise<UserProfileRecord[]>;
}

export async function updateProfile(profileId: string, updates: UserProfileUpdate, accessToken: string): Promise<UserProfileRecord> {
  ensureAuthConfig();

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&select=*`, {
    method: "PATCH",
    headers: {
      ...getRestHeaders(accessToken),
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error(`Profil impossible à modifier: ${await getErrorMessage(response)}`);
  }

  const rows = (await response.json()) as UserProfileRecord[];
  if (!rows[0]) throw new Error("Profil modifié, mais aucune donnée n'a été renvoyée.");
  return rows[0];
}

export async function updatePassword(password: string, accessToken: string): Promise<void> {
  ensureAuthConfig();
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(accessToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    throw new Error(`Mot de passe impossible à modifier: ${await getErrorMessage(response)}`);
  }
}

export async function exportMyData(accessToken: string): Promise<unknown> {
  ensureAuthConfig();
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/export_my_data`, {
    method: "POST",
    headers: { ...getRestHeaders(accessToken), "Content-Type": "application/json" },
    body: "{}"
  });
  if (!response.ok) throw new Error(`Export impossible : ${await getErrorMessage(response)}`);
  return response.json();
}

export async function deactivateMyAccount(accessToken: string): Promise<string> {
  ensureAuthConfig();
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/deactivate_my_account`, {
    method: "POST",
    headers: { ...getRestHeaders(accessToken), "Content-Type": "application/json" },
    body: "{}"
  });
  if (!response.ok) throw new Error(`Suppression impossible : ${await getErrorMessage(response)}`);
  return response.json() as Promise<string>;
}

export async function touchPresence(accessToken: string): Promise<string> {
  ensureAuthConfig();
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/touch_my_presence`, {
    method: "POST",
    headers: {
      ...getRestHeaders(accessToken),
      "Content-Type": "application/json"
    },
    body: "{}"
  });

  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json() as Promise<string>;
}

export async function upsertCurrentProfile(session: AuthSession, displayName?: string): Promise<UserProfileRecord> {
  ensureAuthConfig();

  const fallbackName = session.user.user_metadata?.display_name ?? session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "Membre Tripeer";
  const row = {
    id: session.user.id,
    email: session.user.email ?? null,
    display_name: displayName?.trim() || fallbackName,
    avatar_url: session.user.user_metadata?.avatar_url ?? null,
    verified: false,
    preferred_ambiences: ["Nature", "Découverte locale"],
    safety_preferences: [],
    badges: [],
    is_seed_profile: false
  };

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/profiles?on_conflict=id&select=*`, {
    method: "POST",
    headers: {
      ...getRestHeaders(session.access_token),
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    throw new Error(`Profil impossible à enregistrer: ${await getErrorMessage(response)}`);
  }

  const rows = (await response.json()) as UserProfileRecord[];
  if (rows[0]) return rows[0];

  const existingResponse = await fetch(`${getSupabaseUrl()}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=*&limit=1`, {
    headers: getRestHeaders(session.access_token)
  });
  if (!existingResponse.ok) throw new Error(`Profil introuvable : ${await getErrorMessage(existingResponse)}`);
  const existingRows = await existingResponse.json() as UserProfileRecord[];
  const existingProfile = existingRows[0];
  if (existingProfile?.account_status && existingProfile.account_status !== "active") {
    throw new Error("Ce compte a été désactivé. Contacte le support si tu souhaites le réactiver.");
  }
  if (existingProfile) return existingProfile;
  throw new Error("Profil introuvable après la connexion.");
}

async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const body = await requestAuth<AuthApiResponse>("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  const session = normalizeSession(body);

  if (!session) {
    throw new Error("La session a expiré.");
  }

  storeSession(session);
  return session;
}

function normalizeSession(body: AuthApiResponse): AuthSession | null {
  if (!body.access_token || !body.user) return null;

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at ?? (body.expires_in ? Math.floor(Date.now() / 1000) + body.expires_in : undefined),
    user: body.user
  };
}

async function requestAuth<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(authStorageKey) ?? window.localStorage.getItem(legacyAuthStorageKey);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    window.localStorage.removeItem(legacyAuthStorageKey);
    return session;
  } catch {
    clearStoredSession();
    return null;
  }
}

function storeSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(authStorageKey);
  window.localStorage.removeItem(legacyAuthStorageKey);
}

function getSupabaseUrl() {
  return supabaseUrl ?? "";
}

function getAuthHeaders(accessToken?: string) {
  const apiKey = supabaseAnonKey ?? "";
  return {
    apikey: apiKey,
    Authorization: `Bearer ${accessToken ?? apiKey}`
  };
}

function getRestHeaders(accessToken: string) {
  return getAuthHeaders(accessToken);
}

function ensureAuthConfig() {
  if (!hasSupabaseAuthConfig()) {
    throw new Error("Supabase n'est pas configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local.");
  }
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;

  try {
    const body = JSON.parse(text) as { msg?: string; message?: string; error_description?: string; details?: string; hint?: string };
    return [body.msg, body.message, body.error_description, body.details, body.hint].filter(Boolean).join(" ");
  } catch {
    return text;
  }
}
