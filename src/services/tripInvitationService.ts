export type TripInvitationStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type TripInvitation = {
  id: string;
  trip_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: TripInvitationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function inviteUserToFavoriteTrip(
  tripId: string,
  invitedUserId: string,
  inviterId: string,
  accessToken: string,
  message = "Je pense que cette Trip pourrait te plaire."
): Promise<TripInvitation> {
  const rows = await requestRest<TripInvitation[]>("trip_invitations?on_conflict=trip_id,inviter_id,invited_user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      trip_id: tripId,
      inviter_id: inviterId,
      invited_user_id: invitedUserId,
      status: "pending",
      message
    }
  });

  return rows[0];
}

export async function acceptTripInvitation(invitationId: string, accessToken: string): Promise<TripInvitation> {
  return updateTripInvitationStatus(invitationId, "accepted", accessToken);
}

export async function rejectTripInvitation(invitationId: string, accessToken: string): Promise<TripInvitation> {
  return updateTripInvitationStatus(invitationId, "rejected", accessToken);
}

export async function getMyTripInvitations(userId: string, accessToken: string): Promise<TripInvitation[]> {
  return requestRest<TripInvitation[]>(
    `trip_invitations?or=(inviter_id.eq.${encodeURIComponent(userId)},invited_user_id.eq.${encodeURIComponent(userId)})&select=*&order=created_at.desc`,
    { accessToken }
  );
}

async function updateTripInvitationStatus(invitationId: string, status: TripInvitationStatus, accessToken: string): Promise<TripInvitation> {
  const rows = await requestRest<TripInvitation[]>(`trip_invitations?id=eq.${encodeURIComponent(invitationId)}&select=*`, {
    method: "PATCH",
    accessToken,
    prefer: "return=representation",
    body: { status }
  });

  return rows[0];
}

async function requestRest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    accessToken: string;
    prefer?: string;
    body?: unknown;
  }
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase n'est pas configuré pour les invitations.");
  }

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${options.accessToken}`,
    ...(options.prefer ? { Prefer: options.prefer } : {})
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;

  try {
    const body = JSON.parse(text) as { message?: string; details?: string; hint?: string };
    return [body.message, body.details, body.hint].filter(Boolean).join(" ");
  } catch {
    return text;
  }
}
