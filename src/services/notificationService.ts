export type NotificationType =
  | "join_request_received"
  | "join_request_accepted"
  | "join_request_rejected"
  | "trip_invitation_received"
  | "friend_request_received"
  | "friend_request_accepted"
  | "conversation_new_member";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_trip_id: string | null;
  related_user_id: string | null;
  related_request_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPayload = {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  related_trip_id?: string;
  related_user_id?: string;
  related_request_id?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function createNotification(payload: NotificationPayload, accessToken: string): Promise<NotificationRecord> {
  const rows = await requestRest<NotificationRecord[]>("notifications?select=*", {
    method: "POST",
    accessToken,
    prefer: "return=representation",
    body: {
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      related_trip_id: payload.related_trip_id ?? null,
      related_user_id: payload.related_user_id ?? null,
      related_request_id: payload.related_request_id ?? null
    }
  });

  return rows[0];
}

export async function getMyNotifications(userId: string, accessToken: string): Promise<NotificationRecord[]> {
  return requestRest<NotificationRecord[]>(
    `notifications?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=30`,
    { accessToken }
  );
}

export async function markNotificationAsRead(notificationId: string, accessToken: string): Promise<NotificationRecord> {
  const rows = await requestRest<NotificationRecord[]>(`notifications?id=eq.${encodeURIComponent(notificationId)}&select=*`, {
    method: "PATCH",
    accessToken,
    prefer: "return=representation",
    body: {
      read_at: new Date().toISOString()
    }
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
    throw new Error("Supabase n'est pas configuré pour les notifications.");
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
