export type TripInterestStatus = "interested" | "left";
export type TripJoinRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type TripInterest = {
  id: string;
  trip_id: string;
  user_id: string;
  status: TripInterestStatus;
  created_at?: string;
  updated_at?: string;
};

export type TripJoinRequest = {
  id: string;
  trip_id: string;
  requester_id: string;
  creator_id: string;
  status: TripJoinRequestStatus;
  message: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TripParticipant = {
  id: string;
  trip_id: string;
  user_id: string;
  role: "creator" | "participant";
  status: "active" | "left";
  created_at?: string;
  updated_at?: string;
};

export type TripConversation = {
  id: string;
  trip_id: string;
  conversation_type: "catalog_interest" | "user_project";
  created_at?: string;
};

export type TripConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at?: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  body: string;
  image_paths?: string[];
  created_at?: string;
  updated_at?: string | null;
};

export type ConversationMessageRead = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};

export type TripConfirmation = {
  trip_id: string;
  user_id: string;
  confirmed_at: string;
};

export type TripConversationSummary = {
  conversation: TripConversation;
  latestMessage: ConversationMessage | null;
  unreadCount: number;
};

export type UserTripActions = {
  interests: TripInterest[];
  joinRequests: TripJoinRequest[];
  participants: TripParticipant[];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function hasSupabaseSocialConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function expressInterestInCatalogTrip(tripId: string, userId: string, accessToken: string): Promise<TripInterest> {
  const rows = await requestRest<TripInterest[]>("trip_interests?on_conflict=trip_id,user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      trip_id: tripId,
      user_id: userId,
      status: "interested"
    }
  });

  return rows[0];
}

export async function leaveCatalogTripInterest(tripId: string, userId: string, accessToken: string): Promise<TripInterest> {
  const rows = await requestRest<TripInterest[]>(`trip_interests?trip_id=eq.${encodeURIComponent(tripId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    method: "PATCH",
    accessToken,
    prefer: "return=representation",
    body: {
      status: "left"
    }
  });

  return rows[0];
}

export async function requestToJoinUserProject(
  tripId: string,
  requesterId: string,
  creatorId: string,
  accessToken: string,
  message = "Je souhaite rejoindre ce projet de Trip."
): Promise<TripJoinRequest> {
  const rows = await requestRest<TripJoinRequest[]>("trip_join_requests?on_conflict=trip_id,requester_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      trip_id: tripId,
      requester_id: requesterId,
      creator_id: creatorId,
      status: "pending",
      message
    }
  });

  return rows[0];
}

export async function requestToJoinTrip(
  tripId: string,
  requesterId: string,
  creatorId: string,
  accessToken: string,
  message = "Je souhaite rejoindre ce projet de Trip."
): Promise<TripJoinRequest> {
  return requestToJoinUserProject(tripId, requesterId, creatorId, accessToken, message);
}

export async function cancelJoinRequest(requestId: string, accessToken: string): Promise<TripJoinRequest> {
  return updateJoinRequestStatus(requestId, "cancelled", accessToken);
}

export async function acceptJoinRequest(requestId: string, accessToken: string): Promise<TripJoinRequest> {
  return requestRest<TripJoinRequest>("rpc/accept_trip_join_request", {
    method: "POST",
    accessToken,
    body: { request_id: requestId }
  });
}

export async function rejectJoinRequest(requestId: string, accessToken: string): Promise<TripJoinRequest> {
  return updateJoinRequestStatus(requestId, "rejected", accessToken);
}

export async function getUserTripActions(userId: string, accessToken: string): Promise<UserTripActions> {
  const [interests, joinRequests, participants] = await Promise.all([
    requestRest<TripInterest[]>(`trip_interests?user_id=eq.${encodeURIComponent(userId)}&status=eq.interested&select=*`, { accessToken }),
    requestRest<TripJoinRequest[]>(`trip_join_requests?or=(requester_id.eq.${encodeURIComponent(userId)},creator_id.eq.${encodeURIComponent(userId)})&select=*`, { accessToken }),
    requestRest<TripParticipant[]>(`trip_participants?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=*`, { accessToken })
  ]);

  return { interests, joinRequests, participants };
}

export async function getTripParticipants(tripId: string, accessToken: string): Promise<TripParticipant[]> {
  return requestRest<TripParticipant[]>(`trip_participants?trip_id=eq.${encodeURIComponent(tripId)}&status=eq.active&select=*`, { accessToken });
}

export async function addTripParticipant(tripId: string, userId: string, accessToken: string, role: TripParticipant["role"] = "participant"): Promise<TripParticipant> {
  const rows = await requestRest<TripParticipant[]>("trip_participants?on_conflict=trip_id,user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      trip_id: tripId,
      user_id: userId,
      role,
      status: "active"
    }
  });

  return rows[0];
}

export async function getJoinRequestsForMyTrips(userId: string, accessToken: string): Promise<TripJoinRequest[]> {
  return requestRest<TripJoinRequest[]>(
    `trip_join_requests?creator_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
    { accessToken }
  );
}

export async function getMyJoinRequests(userId: string, accessToken: string): Promise<TripJoinRequest[]> {
  return requestRest<TripJoinRequest[]>(
    `trip_join_requests?requester_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
    { accessToken }
  );
}

export async function ensureTripConversation(
  tripId: string,
  conversationType: TripConversation["conversation_type"],
  accessToken: string
): Promise<TripConversation> {
  const conversationId = `${conversationType}-${tripId}`;
  const rows = await requestRest<TripConversation[]>("conversations?on_conflict=id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      id: conversationId,
      trip_id: tripId,
      conversation_type: conversationType
    }
  });

  return rows[0] ?? { id: conversationId, trip_id: tripId, conversation_type: conversationType };
}

export async function addConversationMember(conversationId: string, userId: string, accessToken: string): Promise<TripConversationMember> {
  const rows = await requestRest<TripConversationMember[]>("conversation_members?on_conflict=conversation_id,user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      conversation_id: conversationId,
      user_id: userId
    }
  });

  return rows[0] ?? { id: `${conversationId}-${userId}`, conversation_id: conversationId, user_id: userId };
}

export async function getConversationMembers(conversationId: string, accessToken: string): Promise<TripConversationMember[]> {
  return requestRest<TripConversationMember[]>(
    `conversation_members?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&order=joined_at.asc`,
    { accessToken }
  );
}

export async function getConversationMessages(conversationId: string, accessToken: string): Promise<ConversationMessage[]> {
  return requestRest<ConversationMessage[]>(
    `conversation_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&order=created_at.asc`,
    { accessToken }
  );
}

export async function sendConversationMessage(
  conversationId: string,
  userId: string,
  body: string,
  accessToken: string,
  imagePaths: string[] = []
): Promise<ConversationMessage> {
  const rows = await requestRest<ConversationMessage[]>("conversation_messages?select=*", {
    method: "POST",
    accessToken,
    prefer: "return=representation",
    body: {
      conversation_id: conversationId,
      user_id: userId,
      body,
      image_paths: imagePaths
    }
  });

  return rows[0];
}

export async function updateConversationMessage(messageId: string, body: string, accessToken: string): Promise<ConversationMessage> {
  const rows = await requestRest<ConversationMessage[]>(`conversation_messages?id=eq.${encodeURIComponent(messageId)}&select=*`, {
    method: "PATCH",
    accessToken,
    prefer: "return=representation",
    body: { body, updated_at: new Date().toISOString() }
  });
  return rows[0];
}

export async function deleteConversationMessage(messageId: string, accessToken: string): Promise<void> {
  await requestRest<void>(`conversation_messages?id=eq.${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    accessToken,
    prefer: "return=minimal"
  });
}

export async function leaveTrip(tripId: string, accessToken: string): Promise<void> {
  await requestRest<void>("rpc/leave_trip", {
    method: "POST",
    accessToken,
    body: { trip_key: tripId }
  });
}

export async function getTripConfirmations(tripId: string, accessToken: string): Promise<TripConfirmation[]> {
  return requestRest<TripConfirmation[]>(
    `trip_confirmations?trip_id=eq.${encodeURIComponent(tripId)}&select=*&order=confirmed_at.asc`,
    { accessToken }
  );
}

export async function confirmTrip(tripId: string, userId: string, accessToken: string): Promise<TripConfirmation> {
  const rows = await requestRest<TripConfirmation[]>("trip_confirmations?on_conflict=trip_id,user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { trip_id: tripId, user_id: userId }
  });
  return rows[0] ?? { trip_id: tripId, user_id: userId, confirmed_at: new Date().toISOString() };
}

export async function withdrawTripConfirmation(tripId: string, userId: string, accessToken: string): Promise<void> {
  await requestRest<void>(`trip_confirmations?trip_id=eq.${encodeURIComponent(tripId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "DELETE",
    accessToken,
    prefer: "return=minimal"
  });
}

export async function markTripConversationAsRead(conversationId: string, userId: string, accessToken: string): Promise<ConversationMessageRead> {
  const rows = await requestRest<ConversationMessageRead[]>("conversation_message_reads?on_conflict=conversation_id,user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString()
    }
  });
  return rows[0];
}

export async function getMyTripConversationSummaries(userId: string, accessToken: string): Promise<TripConversationSummary[]> {
  const memberships = await requestRest<TripConversationMember[]>(
    `conversation_members?user_id=eq.${encodeURIComponent(userId)}&select=*&order=joined_at.desc`,
    { accessToken }
  );
  const conversationIds = [...new Set(memberships.map((member) => member.conversation_id))];
  if (conversationIds.length === 0) return [];

  const inFilter = conversationIds.map((id) => encodeURIComponent(id)).join(",");
  const [conversations, messages, receipts] = await Promise.all([
    requestRest<TripConversation[]>(`conversations?id=in.(${inFilter})&select=*`, { accessToken }),
    requestRest<ConversationMessage[]>(`conversation_messages?conversation_id=in.(${inFilter})&select=*&order=created_at.asc`, { accessToken }),
    requestRest<ConversationMessageRead[]>(`conversation_message_reads?user_id=eq.${encodeURIComponent(userId)}&conversation_id=in.(${inFilter})&select=*`, { accessToken })
  ]);
  const readAt = new Map(receipts.map((receipt) => [receipt.conversation_id, new Date(receipt.last_read_at).getTime()]));

  return conversations.map((conversation) => {
    const conversationMessages = messages.filter((message) => message.conversation_id === conversation.id);
    const lastReadAt = readAt.get(conversation.id) ?? 0;
    return {
      conversation,
      latestMessage: conversationMessages[conversationMessages.length - 1] ?? null,
      unreadCount: conversationMessages.filter((message) => (
        message.user_id !== userId && new Date(message.created_at ?? 0).getTime() > lastReadAt
      )).length
    };
  }).sort((a, b) => (
    new Date(b.latestMessage?.created_at ?? b.conversation.created_at ?? 0).getTime()
    - new Date(a.latestMessage?.created_at ?? a.conversation.created_at ?? 0).getTime()
  ));
}

async function updateJoinRequestStatus(requestId: string, status: TripJoinRequestStatus, accessToken: string): Promise<TripJoinRequest> {
  const rows = await requestRest<TripJoinRequest[]>(`trip_join_requests?id=eq.${encodeURIComponent(requestId)}&select=*`, {
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
  ensureSocialConfig();

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${options.accessToken}`,
    ...(options.prefer ? { Prefer: options.prefer } : {})
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

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

function ensureSocialConfig() {
  if (!hasSupabaseSocialConfig()) {
    throw new Error("Supabase n'est pas configuré pour les actions sociales.");
  }
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
