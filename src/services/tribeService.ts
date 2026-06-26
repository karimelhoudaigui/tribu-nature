import type { UserProfileRecord } from "./authService";

export type TribeConnectionStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type TribeConnection = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: TribeConnectionStatus;
  created_at: string;
  updated_at: string;
};

export type TribeRequestBundle = {
  received: TribeConnection[];
  sent: TribeConnection[];
  accepted: TribeConnection[];
};

export type TribeMessage = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getCompatibleProfiles(userId: string, accessToken: string): Promise<UserProfileRecord[]> {
  return requestRest<UserProfileRecord[]>(
    `profiles?id=neq.${encodeURIComponent(userId)}&select=*&order=display_name.asc`,
    { accessToken }
  );
}

export async function sendTribeRequest(receiverId: string, requesterId: string, accessToken: string): Promise<TribeConnection> {
  const rows = await requestRest<TribeConnection[]>("tribe_connections?on_conflict=requester_id,receiver_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      requester_id: requesterId,
      receiver_id: receiverId,
      status: "pending"
    }
  });

  return rows[0];
}

export async function acceptTribeRequest(connectionId: string, accessToken: string): Promise<TribeConnection> {
  return updateTribeRequest(connectionId, "accepted", accessToken);
}

export async function rejectTribeRequest(connectionId: string, accessToken: string): Promise<TribeConnection> {
  return updateTribeRequest(connectionId, "rejected", accessToken);
}

export async function cancelTribeRequest(connectionId: string, accessToken: string): Promise<TribeConnection> {
  return updateTribeRequest(connectionId, "cancelled", accessToken);
}

export async function getMyTribe(userId: string, accessToken: string): Promise<TribeConnection[]> {
  return requestRest<TribeConnection[]>(
    `tribe_connections?or=(requester_id.eq.${encodeURIComponent(userId)},receiver_id.eq.${encodeURIComponent(userId)})&status=eq.accepted&select=*&order=updated_at.desc`,
    { accessToken }
  );
}

export async function getMyTribeRequests(userId: string, accessToken: string): Promise<TribeRequestBundle> {
  const rows = await requestRest<TribeConnection[]>(
    `tribe_connections?or=(requester_id.eq.${encodeURIComponent(userId)},receiver_id.eq.${encodeURIComponent(userId)})&select=*&order=created_at.desc`,
    { accessToken }
  );

  return {
    received: rows.filter((request) => request.receiver_id === userId && request.status === "pending"),
    sent: rows.filter((request) => request.requester_id === userId && request.status === "pending"),
    accepted: rows.filter((request) => request.status === "accepted")
  };
}

export async function getTribeMessages(connectionId: string, accessToken: string): Promise<TribeMessage[]> {
  return requestRest<TribeMessage[]>(
    `tribe_messages?connection_id=eq.${encodeURIComponent(connectionId)}&select=*&order=created_at.asc`,
    { accessToken }
  );
}

export async function sendTribeMessage(
  connectionId: string,
  senderId: string,
  body: string,
  accessToken: string
): Promise<TribeMessage> {
  const rows = await requestRest<TribeMessage[]>("tribe_messages?select=*", {
    method: "POST",
    accessToken,
    prefer: "return=representation",
    body: {
      connection_id: connectionId,
      sender_id: senderId,
      body
    }
  });

  return rows[0];
}

async function updateTribeRequest(connectionId: string, status: TribeConnectionStatus, accessToken: string): Promise<TribeConnection> {
  const rows = await requestRest<TribeConnection[]>(`tribe_connections?id=eq.${encodeURIComponent(connectionId)}&select=*`, {
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
    throw new Error("Supabase n'est pas configuré pour la Tribu.");
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
