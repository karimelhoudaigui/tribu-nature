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
const authStorageKey = "tribu_nature_auth_session";

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
  await upsertCurrentProfile(session);
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
  if (rows[0]) return rows[0];

  return upsertCurrentProfile(session);
}

export async function getProfileById(profileId: string, accessToken: string): Promise<UserProfileRecord | null> {
  ensureAuthConfig();

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&select=*&limit=1`, {
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

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/profiles?id=in.(${uniqueIds.map(encodeURIComponent).join(",")})&select=*`, {
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

export async function upsertCurrentProfile(session: AuthSession, displayName?: string): Promise<UserProfileRecord> {
  ensureAuthConfig();

  const fallbackName = session.user.user_metadata?.display_name ?? session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "Membre Tribu Nature";
  const row = {
    id: session.user.id,
    email: session.user.email ?? null,
    display_name: displayName?.trim() || fallbackName,
    avatar_url: session.user.user_metadata?.avatar_url ?? null,
    verified: true,
    preferred_ambiences: ["Nature", "Découverte locale"],
    safety_preferences: ["Profil connecté"],
    badges: ["profil connecté"],
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

  const existingProfile = await getProfileById(session.user.id, session.access_token);
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
  const raw = window.localStorage.getItem(authStorageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
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
