/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STORE_NAME?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_DISCORD_URL?: string;
  readonly VITE_TERMS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
