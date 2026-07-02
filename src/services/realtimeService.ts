import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { createSubscriptionRegistry, type SubscriptionListener as Listener } from "./subscriptionRegistry";

const registry = createSubscriptionRegistry();
let realtimeClient: SupabaseClient | null = null;

function getRealtimeClient(accessToken: string) {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!realtimeClient) {
    realtimeClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }
  realtimeClient.realtime.setAuth(accessToken);
  return realtimeClient;
}

function bindChanges(channel: RealtimeChannel, table: string, filter: string | undefined, notify: Listener) {
  return channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
    notify
  );
}

function connectChannel(client: SupabaseClient, name: string, bindings: Array<{ table: string; filter?: string }>, notify: Listener) {
  let channel = client.channel(name);
  bindings.forEach(({ table, filter }) => {
    channel = bindChanges(channel, table, filter, notify);
  });
  channel.subscribe((status) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn(`Canal Realtime ${name} indisponible (${status}).`);
  });
  return async () => {
    await client.removeChannel(channel);
  };
}

export function subscribeToUserSocialUpdates(userId: string, accessToken: string, onChange: Listener) {
  const client = getRealtimeClient(accessToken);
  if (!client) return () => undefined;
  const tokenVersion = accessToken.slice(-8);
  return registry.subscribe(`social:${userId}:${tokenVersion}`, onChange, (notify) => connectChannel(
    client,
    `social-${userId}-${tokenVersion}`,
    [
      { table: "notifications", filter: `user_id=eq.${userId}` },
      { table: "trip_join_requests", filter: `requester_id=eq.${userId}` },
      { table: "trip_join_requests", filter: `creator_id=eq.${userId}` },
      { table: "trip_invitations", filter: `inviter_id=eq.${userId}` },
      { table: "trip_invitations", filter: `invited_user_id=eq.${userId}` },
      { table: "tribe_connections", filter: `requester_id=eq.${userId}` },
      { table: "tribe_connections", filter: `receiver_id=eq.${userId}` },
      { table: "trip_participants", filter: `user_id=eq.${userId}` },
      { table: "trip_interests", filter: `user_id=eq.${userId}` },
      { table: "trip_favorites", filter: `user_id=eq.${userId}` },
      { table: "conversation_members", filter: `user_id=eq.${userId}` },
      { table: "user_blocks", filter: `blocker_id=eq.${userId}` }
    ],
    notify
  ));
}

export function subscribeToTripConversation(conversationId: string, accessToken: string, onChange: Listener, tripId?: string) {
  const client = getRealtimeClient(accessToken);
  if (!client) return () => undefined;
  const tokenVersion = accessToken.slice(-8);
  return registry.subscribe(`trip:${conversationId}:${tokenVersion}`, onChange, (notify) => connectChannel(
    client,
    `trip-${conversationId}-${tokenVersion}`,
    [
      { table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` },
      { table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
      ...(tripId ? [{ table: "trip_confirmations", filter: `trip_id=eq.${tripId}` }] : [])
    ],
    notify
  ));
}

export function subscribeToTribeConversation(connectionId: string, accessToken: string, onChange: Listener) {
  const client = getRealtimeClient(accessToken);
  if (!client) return () => undefined;
  const tokenVersion = accessToken.slice(-8);
  return registry.subscribe(`tribe:${connectionId}:${tokenVersion}`, onChange, (notify) => connectChannel(
    client,
    `tribe-${connectionId}-${tokenVersion}`,
    [{ table: "tribe_messages", filter: `connection_id=eq.${connectionId}` }],
    notify
  ));
}
