const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const tripBucket = "trip-media";
const conversationBucket = "conversation-media";
const maxImageSize = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFiles(files: File[], maxFiles = 8) {
  if (files.length === 0) return "Choisis au moins une photo.";
  if (files.length > maxFiles) return `Tu peux envoyer jusqu'à ${maxFiles} photos à la fois.`;

  const unsupported = files.find((file) => !allowedImageTypes.has(file.type));
  if (unsupported) return `${unsupported.name} n'est pas une image JPG, PNG ou WebP.`;

  const tooLarge = files.find((file) => file.size > maxImageSize);
  if (tooLarge) return `${tooLarge.name} dépasse 10 Mo.`;
  return "";
}

export async function uploadTripImages(userId: string, tripId: string, files: File[], accessToken: string) {
  const error = validateImageFiles(files);
  if (error) throw new Error(error);

  return Promise.all(files.map(async (file, index) => {
    const path = `${userId}/${tripId}/${Date.now()}-${index}.${getExtension(file)}`;
    await uploadObject(tripBucket, path, file, accessToken);
    return {
      path,
      url: `${getSupabaseUrl()}/storage/v1/object/public/${tripBucket}/${encodeStoragePath(path)}`
    };
  }));
}

export async function uploadConversationImages(userId: string, conversationId: string, files: File[], accessToken: string) {
  const error = validateImageFiles(files, 6);
  if (error) throw new Error(error);

  return Promise.all(files.map(async (file, index) => {
    const path = `${userId}/${conversationId}/${Date.now()}-${index}.${getExtension(file)}`;
    await uploadObject(conversationBucket, path, file, accessToken);
    return path;
  }));
}

export async function createConversationMediaUrls(paths: string[], accessToken: string) {
  const entries = await Promise.all(paths.map(async (path) => {
    const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/sign/${conversationBucket}/${encodeStoragePath(path)}`, {
      method: "POST",
      headers: {
        ...getHeaders(accessToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ expiresIn: 3600 })
    });

    if (!response.ok) return [path, ""] as const;
    const data = await response.json() as { signedURL?: string; signedUrl?: string };
    const signedPath = data.signedURL ?? data.signedUrl ?? "";
    const url = signedPath.startsWith("http")
      ? signedPath
      : signedPath
        ? `${getSupabaseUrl()}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`
        : "";
    return [path, url] as const;
  }));

  return Object.fromEntries(entries) as Record<string, string>;
}

export async function deleteConversationImages(paths: string[], accessToken: string) {
  return deleteObjects(conversationBucket, paths, accessToken);
}

export async function deleteTripImages(urls: string[], accessToken: string) {
  const marker = `/storage/v1/object/public/${tripBucket}/`;
  const paths = urls.map((url) => {
    const index = url.indexOf(marker);
    if (index < 0) return "";
    return url.slice(index + marker.length).split("/").map(decodeURIComponent).join("/");
  }).filter(Boolean);
  return deleteObjects(tripBucket, paths, accessToken);
}

async function uploadObject(bucket: string, path: string, file: File, accessToken: string) {
  const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      ...getHeaders(accessToken),
      "Content-Type": file.type,
      "Cache-Control": "31536000",
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) throw new Error(`Photo impossible à envoyer: ${await getErrorMessage(response)}`);
}

async function deleteObjects(bucket: string, paths: string[], accessToken: string) {
  if (paths.length === 0) return;
  const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      ...getHeaders(accessToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefixes: paths })
  });

  if (!response.ok) throw new Error(`Média impossible à supprimer: ${await getErrorMessage(response)}`);
}

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getHeaders(accessToken: string) {
  ensureConfig();
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${accessToken}`
  };
}

function ensureConfig() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase n'est pas configuré pour les médias.");
}

function getSupabaseUrl() {
  ensureConfig();
  return supabaseUrl ?? "";
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message ?? body.error ?? text;
  } catch {
    return text;
  }
}
