const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  const requestedPerPage = Number(url.searchParams.get("per_page") ?? "4");
  const perPage = Math.max(1, Math.min(Number.isFinite(requestedPerPage) ? requestedPerPage : 4, 4));
  if (query.length < 3) return jsonResponse({ error: "La recherche est trop courte." }, 400);

  const apiKey = Deno.env.get("PEXELS_API_KEY");
  if (!apiKey) return jsonResponse({ error: "PEXELS_API_KEY n'est pas configurée." }, 503);

  const endpoint = new URL("https://api.pexels.com/v1/search");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("orientation", "landscape");
  endpoint.searchParams.set("size", "large");
  endpoint.searchParams.set("locale", "fr-FR");
  endpoint.searchParams.set("per_page", String(perPage));

  try {
    const pexelsResponse = await fetch(endpoint, { headers: { Authorization: apiKey } });
    if (!pexelsResponse.ok) {
      const details = await pexelsResponse.text();
      console.error("Pexels API error", pexelsResponse.status, details);
      return jsonResponse({ error: "La recherche photo est momentanément indisponible." }, 502);
    }

    const payload = await pexelsResponse.json() as {
      photos?: Array<{
        id: number;
        alt?: string;
        photographer: string;
        photographer_url: string;
        url: string;
        src: { large2x?: string; large?: string; landscape?: string };
      }>;
    };
    const photos = (payload.photos ?? []).map((photo) => ({
      id: photo.id,
      alt: photo.alt ?? query,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      pexelsUrl: photo.url,
      src: photo.src.large2x ?? photo.src.large ?? photo.src.landscape ?? ""
    })).filter((photo) => photo.src);

    return jsonResponse({ query, photos }, 200, { "Cache-Control": "public, max-age=86400" });
  } catch (error) {
    console.error("Pexels search failed", error);
    return jsonResponse({ error: "Impossible de contacter Pexels." }, 502);
  }
});

function jsonResponse(payload: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json; charset=utf-8" }
  });
}
