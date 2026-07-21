const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const CONTACT_RECIPIENT_EMAIL = "elhoudaiguikarim91@gmail.com";

export function buildContactMailtoUrl(payload: { email: string; subject: string; body: string; requestType?: string }) {
  const subject = `[${payload.requestType ?? "Contact"}] ${payload.subject.trim()}`.slice(0, 180);
  const body = [
    `Email de reponse: ${payload.email.trim()}`,
    `Type de demande: ${payload.requestType ?? "Contact"}`,
    "",
    payload.body.trim()
  ].join("\n");
  return `mailto:${CONTACT_RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function sendContactMessage(
  payload: { userId?: string; email: string; subject: string; body: string; requestType?: string },
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
      subject: `[${payload.requestType ?? "Contact"}] ${payload.subject.trim()}`.slice(0, 180),
      body: [
        `Destinataire: ${CONTACT_RECIPIENT_EMAIL}`,
        `Type de demande: ${payload.requestType ?? "Contact"}`,
        "",
        payload.body.trim()
      ].join("\n")
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
