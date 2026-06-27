import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

loadDotEnv(".env.local");

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = extractProjectRef(SUPABASE_URL);

test("Supabase social flows: profil, trips, notifications, conversations et tribu", {
  timeout: 120_000,
  skip: !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ACCESS_TOKEN
    ? "Ajoute VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY et SUPABASE_ACCESS_TOKEN pour lancer ce test d'intégration."
    : false
}, async () => {
  const runId = `e2e-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const cleanup = {
    userIds: [],
    tripIds: [],
    connectionIds: []
  };

  try {
    const owner = await signUpTestUser(runId, "owner", "Samy Test");
    const requester = await signUpTestUser(runId, "requester", "Karim Test");
    cleanup.userIds.push(owner.user.id, requester.user.id);

    await upsertProfile(owner, {
      display_name: "Samy Test",
      city: "Bordeaux",
      bio: "Compte automatisé pour stabiliser le parcours social.",
      age_range: "30 ans",
      physical_level: "facile",
      budget_range: "200 à 350 €",
      adventure_style: "Calme & déconnexion",
      preferred_ambiences: ["Calme & déconnexion", "Découverte locale"],
      safety_preferences: ["Profil connecté", "Petit groupe"],
      badges: ["test", "profil connecté"]
    });
    await upsertProfile(requester, {
      display_name: "Karim Test",
      city: "Paris",
      bio: "Compte automatisé pour vérifier les demandes et conversations.",
      age_range: "29 ans",
      physical_level: "intermédiaire",
      budget_range: "200 à 350 €",
      adventure_style: "Nature",
      preferred_ambiences: ["Nature", "Montagne"],
      safety_preferences: ["Profil connecté"],
      badges: ["test", "fiable"]
    });

    const ownerPreferences = await rest("travel_preferences?on_conflict=user_id&select=*", {
      method: "POST",
      token: owner.access_token,
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        user_id: owner.user.id,
        preferred_destinations: ["Valais"],
        preferred_activities: ["Randonnée"],
        preferred_accommodation: ["Refuge"],
        food_preferences: ["Végétarien"],
        group_preferences: ["Petit groupe"],
        personal_values: ["Groupe calme"],
        availability_periods: ["Week-end"],
        max_distance_km: 500,
        preferred_group_size_min: 3,
        preferred_group_size_max: 6
      }
    });
    assert.equal(ownerPreferences[0].user_id, owner.user.id);
    assert.deepEqual(ownerPreferences[0].preferred_activities, ["Randonnée"]);

    const privatePreferences = await rest(`travel_preferences?user_id=eq.${encodeURIComponent(owner.user.id)}&select=*`, {
      token: requester.access_token
    });
    assert.equal(privatePreferences.length, 0);

    const updatedProfile = await rest("profiles?id=eq." + encodeURIComponent(owner.user.id) + "&select=*", {
      method: "PATCH",
      token: owner.access_token,
      prefer: "return=representation",
      body: { city: "Lyon", adventure_style: "Sport & dépassement" }
    });
    assert.equal(updatedProfile[0].city, "Lyon");
    assert.equal(updatedProfile[0].adventure_style, "Sport & dépassement");

    const catalogTripId = `${runId}-catalog`;
    cleanup.tripIds.push(catalogTripId);
    await createCatalogTrip(catalogTripId);

    const catalogConversation = await ensureTripConversation(catalogTripId, "catalog_interest", owner.access_token);
    await joinCatalogIdea(catalogTripId, catalogConversation.id, owner);
    await joinCatalogIdea(catalogTripId, catalogConversation.id, requester);

    const catalogMembers = await rest(`conversation_members?conversation_id=eq.${encodeURIComponent(catalogConversation.id)}&select=*`, {
      token: owner.access_token
    });
    assert.deepEqual(new Set(catalogMembers.map((member) => member.user_id)), new Set([owner.user.id, requester.user.id]));

    const catalogMessage = await sendConversationMessage(catalogConversation.id, owner, "Message test sur une idée de voyage.");
    const requesterCatalogMessages = await rest(`conversation_messages?conversation_id=eq.${encodeURIComponent(catalogConversation.id)}&select=*&order=created_at.asc`, {
      token: requester.access_token
    });
    assert.ok(requesterCatalogMessages.some((message) => message.id === catalogMessage.id));

    const userTripId = `${runId}-user-trip`;
    cleanup.tripIds.push(userTripId);
    await createUserProjectTrip(userTripId, owner);
    const userProjectConversation = await ensureTripConversation(userTripId, "user_project", owner.access_token);
    await addTripParticipant(userTripId, owner.user.id, owner.access_token, "creator");
    await addConversationMember(userProjectConversation.id, owner.user.id, owner.access_token);

    const joinRequest = await requestToJoinTrip(userTripId, requester.user.id, owner.user.id, requester.access_token);
    await createNotification(owner.user.id, requester.user.id, userTripId, joinRequest.id, requester.access_token);

    const ownerNotifications = await rest(`notifications?user_id=eq.${encodeURIComponent(owner.user.id)}&related_request_id=eq.${encodeURIComponent(joinRequest.id)}&select=*`, {
      token: owner.access_token
    });
    assert.equal(ownerNotifications.length, 1);

    const acceptedRequest = await rest(`trip_join_requests?id=eq.${encodeURIComponent(joinRequest.id)}&select=*`, {
      method: "PATCH",
      token: owner.access_token,
      prefer: "return=representation",
      body: { status: "accepted" }
    });
    assert.equal(acceptedRequest[0].status, "accepted");

    await addTripParticipant(userTripId, requester.user.id, owner.access_token, "participant");
    await addConversationMember(userProjectConversation.id, requester.user.id, owner.access_token);

    const requesterProjectMessage = await sendConversationMessage(userProjectConversation.id, requester, "Je confirme ma participation au Trip utilisateur.");
    const ownerProjectMessages = await rest(`conversation_messages?conversation_id=eq.${encodeURIComponent(userProjectConversation.id)}&select=*`, {
      token: owner.access_token
    });
    assert.ok(ownerProjectMessages.some((message) => message.id === requesterProjectMessage.id));

    const tribeConnection = await rest("tribe_connections?on_conflict=requester_id,receiver_id&select=*", {
      method: "POST",
      token: owner.access_token,
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        requester_id: owner.user.id,
        receiver_id: requester.user.id,
        status: "pending"
      }
    });
    cleanup.connectionIds.push(tribeConnection[0].id);

    const acceptedConnection = await rest(`tribe_connections?id=eq.${encodeURIComponent(tribeConnection[0].id)}&select=*`, {
      method: "PATCH",
      token: requester.access_token,
      prefer: "return=representation",
      body: { status: "accepted" }
    });
    assert.equal(acceptedConnection[0].status, "accepted");

    const privateMessage = await rest("tribe_messages?select=*", {
      method: "POST",
      token: owner.access_token,
      prefer: "return=representation",
      body: {
        connection_id: tribeConnection[0].id,
        sender_id: owner.user.id,
        body: "Message privé de test dans Ma tribu."
      }
    });

    const requesterPrivateMessages = await rest(`tribe_messages?connection_id=eq.${encodeURIComponent(tribeConnection[0].id)}&select=*`, {
      token: requester.access_token
    });
    assert.ok(requesterPrivateMessages.some((message) => message.id === privateMessage[0].id));

    const readReceipt = await rest("tribe_message_reads?on_conflict=connection_id,user_id&select=*", {
      method: "POST",
      token: requester.access_token,
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        connection_id: tribeConnection[0].id,
        user_id: requester.user.id,
        last_read_at: new Date().toISOString()
      }
    });
    assert.equal(readReceipt[0].connection_id, tribeConnection[0].id);
    assert.equal(readReceipt[0].user_id, requester.user.id);
  } finally {
    await cleanupTestData(cleanup);
  }
});

function loadDotEnv(file) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Tests can still run when the env is injected by the shell or CI.
  }
}

function extractProjectRef(url) {
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co$/);
  return match?.[1] ?? "";
}

async function signUpTestUser(runId, role, displayName) {
  const email = `tribunature.${runId}.${role}@gmail.com`;
  const password = `Tribu-${runId}-Passw0rd!`;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceRoleHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName
      }
    })
  });

  if (!response.ok) throw new Error(`Admin user creation ${role} failed: ${await response.text()}`);

  return signInTestUser(email, password);
}

async function signInTestUser(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) throw new Error(`Signin failed: ${await response.text()}`);

  const session = await response.json();
  if (!session.access_token || !session.user?.id) throw new Error("Supabase signin did not return a session.");
  return session;
}

async function upsertProfile(session, values) {
  const rows = await rest("profiles?on_conflict=id&select=*", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: session.user.id,
      email: session.user.email,
      avatar_url: null,
      verified: true,
      past_trips: 0,
      is_seed_profile: false,
      ...values
    }
  });

  assert.equal(rows[0].id, session.user.id);
  return rows[0];
}

async function createCatalogTrip(tripId) {
  await managementQuery(`
    insert into public.trips (
      id, title, destination, image_url, dates, duration, budget_min, budget_max,
      physical_level, ambience_tags, compatibility_score, interested_count,
      status, description, activities, generation_reasons, matched_member_ids,
      generated_activity_ids, community, created_by, brief, card_type,
      created_by_type, planning_status, visibility, moderation_status,
      creator_name, creator_id, departure_city, max_participants, current_participants,
      conversation_id, created_from_catalog
    ) values (
      '${sql(tripId)}',
      'Idée catalogue test ${sql(tripId)}',
      'Zone test automatisée',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
      'Dates à décider ensemble',
      'Week-end',
      120,
      220,
      'facile',
      array['Nature', 'Test'],
      91,
      0,
      'Idée publiée',
      'Trip catalogue créé uniquement pour les tests automatisés.',
      array['Discussion groupe', 'Organisation dates'],
      array[]::text[],
      array[]::text[],
      array[]::text[],
      false,
      null,
      'Trip catalogue de test',
      'catalog',
      'platform',
      'idea',
      'public',
      'approved',
      null,
      null,
      null,
      8,
      0,
      null,
      false
    );
  `);
}

async function createUserProjectTrip(tripId, owner) {
  const rows = await rest("trips?select=*", {
    method: "POST",
    token: owner.access_token,
    prefer: "return=representation",
    body: {
      id: tripId,
      title: `Trip utilisateur test ${tripId}`,
      destination: "Destination test",
      image_url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
      dates: "Dates de test",
      duration: "Week-end",
      budget_min: 100,
      budget_max: 250,
      physical_level: "facile",
      ambience_tags: ["Nature", "Test"],
      compatibility_score: 88,
      interested_count: 1,
      status: "Trip publiée",
      description: "Trip utilisateur créé uniquement pour les tests automatisés.",
      activities: ["Randonnée test"],
      generation_reasons: [],
      matched_member_ids: [],
      generated_activity_ids: [],
      community: true,
      created_by: "Samy Test",
      brief: "Trip utilisateur de test",
      card_type: "user_project",
      created_by_type: "user",
      planning_status: "planned",
      visibility: "public",
      moderation_status: "approved",
      creator_name: "Samy Test",
      creator_id: owner.user.id,
      departure_city: "Lyon",
      max_participants: 6,
      current_participants: 1,
      created_from_catalog: false
    }
  });

  assert.equal(rows[0].id, tripId);
  return rows[0];
}

async function joinCatalogIdea(tripId, conversationId, session) {
  await rest("trip_interests?on_conflict=trip_id,user_id&select=*", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates,return=representation",
    body: { trip_id: tripId, user_id: session.user.id, status: "interested" }
  });
  await addTripParticipant(tripId, session.user.id, session.access_token, "participant");
  await addConversationMember(conversationId, session.user.id, session.access_token);
}

async function requestToJoinTrip(tripId, requesterId, creatorId, token) {
  const rows = await rest("trip_join_requests?on_conflict=trip_id,requester_id&select=*", {
    method: "POST",
    token,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      trip_id: tripId,
      requester_id: requesterId,
      creator_id: creatorId,
      status: "pending",
      message: "Je souhaite rejoindre ce projet de Trip."
    }
  });

  return rows[0];
}

async function createNotification(userId, relatedUserId, tripId, requestId, token) {
  await rest("notifications", {
    method: "POST",
    token,
    prefer: "return=minimal",
    body: {
      user_id: userId,
      type: "join_request_received",
      title: "Demande test reçue",
      body: "Un membre test souhaite rejoindre ton Trip.",
      related_trip_id: tripId,
      related_user_id: relatedUserId,
      related_request_id: requestId
    }
  });
}

async function ensureTripConversation(tripId, conversationType, token) {
  const id = `${conversationType}-${tripId}`;
  const rows = await rest("conversations?on_conflict=id&select=*", {
    method: "POST",
    token,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { id, trip_id: tripId, conversation_type: conversationType }
  });

  return rows[0] ?? { id, trip_id: tripId, conversation_type: conversationType };
}

async function addTripParticipant(tripId, userId, token, role) {
  const rows = await rest("trip_participants?on_conflict=trip_id,user_id&select=*", {
    method: "POST",
    token,
    prefer: "resolution=merge-duplicates,return=representation",
    body: { trip_id: tripId, user_id: userId, role, status: "active" }
  });

  return rows[0];
}

async function addConversationMember(conversationId, userId, token) {
  const rows = await rest("conversation_members?on_conflict=conversation_id,user_id&select=*", {
    method: "POST",
    token,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { conversation_id: conversationId, user_id: userId }
  });

  return rows[0] ?? { conversation_id: conversationId, user_id: userId };
}

async function sendConversationMessage(conversationId, session, body) {
  const rows = await rest("conversation_messages?select=*", {
    method: "POST",
    token: session.access_token,
    prefer: "return=representation",
    body: { conversation_id: conversationId, user_id: session.user.id, body }
  });

  return rows[0];
}

async function rest(path, { method = "GET", token, prefer, body } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    ...(prefer ? { Prefer: prefer } : {})
  };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`${method} ${path} failed: ${response.status} ${await response.text()}`);
  const text = await response.text();
  if (!text) return undefined;
  return JSON.parse(text);
}

function authHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
}

function serviceRoleHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
}

async function managementQuery(query) {
  assert.ok(PROJECT_REF, "Unable to extract Supabase project ref from VITE_SUPABASE_URL.");

  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) throw new Error(`Management query failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function cleanupTestData(cleanup) {
  const userIds = cleanup.userIds.map(sql);
  const tripIds = cleanup.tripIds.map(sql);
  const connectionIds = cleanup.connectionIds.map(sql);

  const statements = [];

  if (connectionIds.length) {
    statements.push(`delete from public.tribe_messages where connection_id in (${connectionIds.map((id) => `'${id}'`).join(",")});`);
    statements.push(`delete from public.tribe_connections where id in (${connectionIds.map((id) => `'${id}'`).join(",")});`);
  }

  if (tripIds.length) {
    statements.push(`delete from public.trips where id in (${tripIds.map((id) => `'${id}'`).join(",")});`);
  }

  if (userIds.length) {
    const ids = userIds.map((id) => `'${id}'`).join(",");
    statements.push(`delete from public.notifications where user_id in (${ids}) or related_user_id in (${ids});`);
    statements.push(`delete from public.trip_interests where user_id in (${ids});`);
    statements.push(`delete from public.trip_join_requests where requester_id in (${ids}) or creator_id in (${ids});`);
    statements.push(`delete from public.trip_participants where user_id in (${ids});`);
    statements.push(`delete from public.conversation_messages where user_id in (${ids});`);
    statements.push(`delete from public.conversation_members where user_id in (${ids});`);
    statements.push(`delete from public.profiles where id in (${ids});`);
    statements.push(`delete from auth.users where id in (${ids});`);
  }

  if (statements.length === 0) return;
  await managementQuery(statements.join("\n"));
}

function sql(value) {
  return String(value).replaceAll("'", "''");
}
