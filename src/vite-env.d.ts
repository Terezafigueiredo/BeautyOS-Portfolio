/// <reference types="vite/client" />

// Declara as variáveis de ambiente customizadas do BeautyOS para que
// import.meta.env tenha autocompletar e checagem de tipos no TypeScript.
// Os valores reais vêm do arquivo ".env" (nunca commitado — veja .env.example).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
