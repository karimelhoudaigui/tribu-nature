import { readFileSync } from "node:fs";

loadDotEnv(".env.local");

const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const projectRef = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co$/)?.[1] ?? "";
const migrationPath = "supabase/migrations/202606300003_prepare_public_beta.sql";

if (!accessToken || !projectRef) {
  throw new Error("SUPABASE_ACCESS_TOKEN ou VITE_SUPABASE_URL manquant.");
}

const source = readFileSync(migrationPath, "utf8");
const requestedSteps = new Set((process.env.BETA_STEPS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const steps = source.split(/^-- beta-step: /m).map((part) => part.trim()).filter(Boolean).map((part) => {
  const newline = part.indexOf("\n");
  return { name: part.slice(0, newline).trim(), sql: part.slice(newline + 1).trim() };
}).filter((step) => requestedSteps.size === 0 || requestedSteps.has(step.name));

for (const [index, step] of steps.entries()) {
  process.stdout.write(`[${index + 1}/${steps.length}] ${step.name}... `);
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: step.sql }),
    signal: AbortSignal.timeout(60_000)
  });
  const text = await response.text();
  if (!response.ok) {
    process.stdout.write("échec\n");
    throw new Error(`${response.status} ${text}`);
  }
  process.stdout.write("ok\n");
}

function loadDotEnv(file) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // CI and local shells can inject the environment directly.
  }
}
