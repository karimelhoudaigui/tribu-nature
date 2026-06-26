const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const avatarBucket = "avatars";
const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedProfileAvatar = {
  avatar_url: string;
  avatar_path: string;
};

export function validateProfileAvatarFile(file: File) {
  if (!allowedAvatarMimeTypes.has(file.type)) {
    return "Choisis une image JPG, PNG ou WebP.";
  }

  if (file.size > maxAvatarSize) {
    return "La photo est trop lourde. Taille maximum : 5 Mo.";
  }

  return "";
}

export async function uploadProfileAvatar(userId: string, file: File, accessToken: string): Promise<UploadedProfileAvatar> {
  ensureProfileConfig();

  const validationError = validateProfileAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const extension = getAvatarExtension(file);
  const avatarPath = `${userId}/avatar-${Date.now()}.${extension}`;
  const encodedPath = encodeStoragePath(avatarPath);

  const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${avatarBucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: getSupabaseAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type,
      "Cache-Control": "3600",
      "x-upsert": "true"
    },
    body: file
  });

  if (!response.ok) {
    throw new Error(`Photo impossible à envoyer: ${await getErrorMessage(response)}`);
  }

  return {
    avatar_path: avatarPath,
    avatar_url: `${getSupabaseUrl()}/storage/v1/object/public/${avatarBucket}/${encodedPath}`
  };
}

function getAvatarExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function hasProfileConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function ensureProfileConfig() {
  if (!hasProfileConfig()) {
    throw new Error("Supabase n'est pas configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local.");
  }
}

function getSupabaseUrl() {
  return supabaseUrl ?? "";
}

function getSupabaseAnonKey() {
  return supabaseAnonKey ?? "";
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;

  try {
    const body = JSON.parse(text) as { msg?: string; message?: string; error?: string; error_description?: string; details?: string; hint?: string };
    return [body.msg, body.message, body.error, body.error_description, body.details, body.hint].filter(Boolean).join(" ");
  } catch {
    return text;
  }
}
