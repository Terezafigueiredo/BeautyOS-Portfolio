import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// IMPORTANTE — segurança:
// Este arquivo roda no navegador (frontend), então só pode usar a chave
// pública "publishable". Ela é segura para expor publicamente porque
// todo o acesso ao banco é controlado pelas políticas de Row Level
// Security (RLS) do Supabase — veja supabase/schema.sql.
//
// NUNCA importe ou utilize a "service_role key" aqui (ou em qualquer
// outro código de frontend): ela ignora o RLS por completo e só deve
// existir em ambiente de servidor/administração.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// O site precisa continuar funcionando normalmente mesmo sem essas
// variáveis configuradas (por exemplo, num ambiente novo antes do
// ".env" ser criado). Por isso avisamos no console em vez de quebrar
// a aplicação inteira.
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL e/ou VITE_SUPABASE_PUBLISHABLE_KEY não " +
      "estão definidos. Copie .env.example para .env e preencha com os " +
      "dados do seu projeto Supabase para habilitar a integração."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "publishable-key-not-configured"
);
