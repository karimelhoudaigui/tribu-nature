const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function sendContactMessage(
  payload: { userId?: string; email: string; subject: string; body: string },
  accessToken?: string
) {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Le formulaire de contact est indisponible.");
  const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      user_id: payload.userId ?? null,
      email: payload.email.trim(),
      subject: payload.subject.trim(),
      body: payload.body.trim()
    })
  });

  if (!response.ok) throw new Error(await getErrorMessage(response));
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return "Message impossible à envoyer.";
  try {
    const body = JSON.parse(text) as { message?: string };
    return body.message ?? text;
  } catch {
    return text;
  }
}
