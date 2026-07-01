export type ReportTargetType = "user" | "trip" | "message" | "conversation";
export type ReportReason = "harassment" | "spam" | "fraud" | "unsafe" | "hate" | "inappropriate" | "other";

export type UserBlock = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type ReportTarget = {
  type: ReportTargetType;
  label: string;
  reportedUserId?: string;
  reportedTripId?: string;
  reportedMessageId?: string;
  reportedConversationId?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getMyBlocks(userId: string, accessToken: string): Promise<UserBlock[]> {
  return requestRest<UserBlock[]>(`user_blocks?blocker_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`, { accessToken });
}

export async function blockUser(blockerId: string, blockedId: string, accessToken: string): Promise<UserBlock> {
  const rows = await requestRest<UserBlock[]>("user_blocks?on_conflict=blocker_id,blocked_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { blocker_id: blockerId, blocked_id: blockedId }
  });
  if (rows[0]) return rows[0];
  const existing = await getMyBlocks(blockerId, accessToken);
  const block = existing.find((item) => item.blocked_id === blockedId);
  if (!block) throw new Error("Le blocage n'a pas pu être enregistré.");
  return block;
}

export async function unblockUser(blockerId: string, blockedId: string, accessToken: string): Promise<void> {
  await requestRest<void>(`user_blocks?blocker_id=eq.${encodeURIComponent(blockerId)}&blocked_id=eq.${encodeURIComponent(blockedId)}`, {
    method: "DELETE",
    accessToken,
    prefer: "return=minimal"
  });
}

export async function createUserReport(
  reporterId: string,
  target: ReportTarget,
  reason: ReportReason,
  details: string,
  accessToken: string
): Promise<void> {
  await requestRest<void>("user_reports", {
    method: "POST",
    accessToken,
    prefer: "return=minimal",
    body: {
      reporter_id: reporterId,
      target_type: target.type,
      reason,
      details: details.trim() || null,
      reported_user_id: target.reportedUserId ?? null,
      reported_trip_id: target.reportedTripId ?? null,
      reported_message_id: target.reportedMessageId ?? null,
      reported_conversation_id: target.reportedConversationId ?? null,
      status: "pending"
    }
  });
}

async function requestRest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; accessToken: string; prefer?: string; body?: unknown }
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase n'est pas configuré pour la sécurité.");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { message?: string; details?: string; hint?: string };
    return [body.message, body.details, body.hint].filter(Boolean).join(" ");
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}
