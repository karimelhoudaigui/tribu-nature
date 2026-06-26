/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_DATATOURISME_API_URL?: string;
  readonly VITE_DATATOURISME_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
