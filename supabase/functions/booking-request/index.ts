// BeautyOS — Edge Function: booking-request
// =========================================================
// FUNDAÇÃO da Fase 2. Endpoint público (chamado com a publishable
// key, sem conta/login de cliente) que hoje faz SOMENTE:
//   autenticação da API key (via @supabase/server) -> parsing seguro
//   -> validação estrita -> resposta padronizada.
//
// MODELO DE AUTENTICAÇÃO (corrigido — ver histórico da conversa):
// A publishable key atual do Supabase (formato "sb_publishable_...")
// NÃO é um JWT — é uma API key opaca, validada pela própria
// plataforma/SDK contra o registro de chaves do projeto. A antiga
// "anon key" ERA um JWT; esse modelo legado não é usado aqui.
//
// Como a publishable key não é JWT, a checagem de gateway da
// plataforma (verify_jwt) não consegue validá-la — por isso
// verify_jwt = false em supabase/config.toml para esta função (ver
// esse arquivo para a explicação completa). Isso NÃO significa
// "aceitar qualquer chamada": a autenticação de verdade acontece
// via @supabase/server, com withSupabase({ auth: 'publishable' }),
// que exige uma publishable key válida deste projeto no header
// "apikey" antes mesmo do handler de negócio rodar — rejeitando
// automaticamente quem não apresentar uma.
//
// Nenhuma verificação manual de chave é reimplementada aqui: o SDK
// oficial resolve isso.
//
// PERSISTÊNCIA (Fase 2.1 — IMPLEMENTADA, só local nesta etapa):
// A migration 005 concede EXECUTE em public.create_booking_request
// SOMENTE para "service_role"; a migration 006 corrigiu o BLOCKER de
// idempotência da função (client_request_id reaproveitado com payload
// diferente agora levanta "idempotency_mismatch" em vez de devolver
// silenciosamente o registro antigo). Ambas foram validadas no banco
// LOCAL (ver histórico da conversa) antes desta alteração.
//
// A chamada usa ctx.supabaseAdmin — o cliente administrativo
// (service_role) já disponibilizado pelo wrapper @supabase/server,
// que por sua vez lê SUPABASE_URL e a credencial server-side moderna
// (SUPABASE_SECRET_KEY/SUPABASE_SECRET_KEYS, com fallback legado
// SUPABASE_SERVICE_ROLE_KEY) — todas auto-injetadas pelo runtime de
// Edge Functions (local e produção), sem nenhuma configuração manual
// nossa. Ver callCreateBookingRequest(), mais abaixo: é o ÚNICO ponto
// deste arquivo que toca ctx.supabaseAdmin, isolado de propósito para
// ficar auditável — nenhum outro código usa esse cliente para mais
// nada. ctx.supabase (RLS-scoped, anônimo) continua sem uso nesta
// fase, porque este endpoint não lê nada do banco em nome do visitante.
//
// VALIDAÇÃO AGORA INCLUI "address" (Fase 2.1): obrigatório quando
// location = "home", proibido quando location = "studio" — mesma
// regra de negócio já existente em public.bookings (CHECK) e em
// public.booking_request_contacts.address.
//
// NÃO faz ainda (de propósito):
//   - consulta de disponibilidade / Google Calendar (create_booking_
//     request já faz a checagem final server-side; a consulta ao
//     Calendar seria só um sinal antecipado, não implementado aqui);
//   - qualquer coisa relacionada a PIX/Santander ou WhatsApp;
//   - qualquer alteração no frontend/BookingModal.
// =========================================================

// Resolvido via supabase/functions/booking-request/deno.json (import
// map), não como especificador "npm:" inline sem versão — a versão
// exata está fixada lá, verificada contra o registro npm real antes
// de ser fixada (ver comentário no próprio deno.json).
import { withSupabase } from "@supabase/server";

// =========================================================
// Tipos
// =========================================================

type BookingLocation = "studio" | "home";

interface RawBookingRequestPayload {
  client_request_id?: unknown;
  package_id?: unknown;
  location?: unknown;
  event_date?: unknown;
  ready_time?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  notes?: unknown;
}

interface ValidatedBookingRequestInput {
  clientRequestId: string;
  packageId: string;
  location: BookingLocation;
  eventDate: string; // YYYY-MM-DD — nome alinhado a p_event_date da RPC
  readyTime: string; // HH:MM — nome alinhado a p_ready_time da RPC
  name: string;
  phone: string; // normalizado (só dígitos, com "+" opcional na frente)
  email: string | null;
  // Obrigatório quando location = "home", proibido quando location =
  // "studio" — ver validação dedicada em validatePayload(). Espelha
  // exatamente a mesma regra de negócio já presente em
  // public.bookings (CHECK) e em public.booking_request_contacts
  // (coluna "address", preenchida só para "home" por
  // create_booking_request — ver migration 001/002).
  address: string | null;
  notes: string | null;
}

interface ApiErrorResponseBody {
  ok: false;
  code: string;
  message: string;
  // Correlaciona uma resposta de erro com os logs internos do
  // servidor (gerado por requisição, nunca PII) — útil para suporte
  // sem precisar expor nenhum detalhe interno ao cliente.
  request_id: string;
}

interface BookingRequestResponseData {
  id: unknown;
  status: unknown;
  expires_at?: unknown;
  price_cents?: unknown;
  duration_minutes?: unknown;
  start_time?: unknown;
}

interface ApiSuccessResponseBody {
  ok: true;
  // Nome deliberado: deixa explícito que isto é uma SOLICITAÇÃO
  // (booking_request), nunca um agendamento confirmado — nenhuma
  // integração de Google Calendar/PIX existe ainda nesta fase.
  booking_request: BookingRequestResponseData;
}

// =========================================================
// Constantes de validação
// =========================================================

const KNOWN_FIELDS = new Set<keyof RawBookingRequestPayload>([
  "client_request_id",
  "package_id",
  "location",
  "event_date",
  "ready_time",
  "name",
  "phone",
  "email",
  "address",
  "notes",
]);

const ALLOWED_LOCATIONS = new Set<BookingLocation>(["studio", "home"]);

const FIELD_LIMITS = {
  name: 120,
  // Limite generoso sobre o telefone JÁ NORMALIZADO (só dígitos +
  // opcional "+" na frente) — não é uma regra de formato brasileiro,
  // só um teto de sanidade (E.164 permite no máximo 15 dígitos).
  phoneDigitsMin: 8,
  phoneDigitsMax: 15,
  email: 254,
  address: 200,
  notes: 500,
} as const;

// Corpo máximo aceito ANTES de tentar JSON.parse — este payload não
// deveria nunca chegar perto disso; 10 KB já é bastante folgado.
const MAX_BODY_BYTES = 10_000;

// =========================================================
// TTL da reserva — SEMPRE decidido pelo backend, nunca pelo payload
// do navegador (validatePayload() nem aceita um campo de TTL).
// =========================================================
// Mesmo limite de sanidade já validado DENTRO de create_booking_request
// (migration 002: 0 < ttl <= c_reservation_ttl_max_minutes = 180).
// Repetido aqui só para rejeitar uma configuração claramente errada
// ANTES de gastar uma chamada de rede ao banco — a autoridade final
// continua sendo o CHECK dentro da própria função.
const RESERVATION_TTL_SANITY_MAX_MINUTES = 180;

// Valor de TESTE para desenvolvimento local — NÃO é a decisão de
// negócio definitiva (essa depende da regra do PIX, ainda não
// implementada). Configurável via BOOKING_RESERVATION_TTL_MINUTES em
// supabase/functions/.env (ver supabase/functions/.env.example);
// produção precisa decidir e configurar isso explicitamente antes de
// qualquer deploy real — fora do escopo desta etapa.
const DEFAULT_DEV_RESERVATION_TTL_MINUTES = 15;

function getReservationTtlMinutes(): number | null {
  const configured = Deno.env.get("BOOKING_RESERVATION_TTL_MINUTES");
  const minutes = configured
    ? Number.parseInt(configured, 10)
    : DEFAULT_DEV_RESERVATION_TTL_MINUTES;

  if (
    !Number.isInteger(minutes) ||
    minutes <= 0 ||
    minutes > RESERVATION_TTL_SANITY_MAX_MINUTES
  ) {
    return null;
  }
  return minutes;
}

// =========================================================
// Rate limiting — hashes de IP/telefone via HMAC-SHA-256
// =========================================================
// O Postgres NUNCA recebe IP/telefone em texto puro para fins de rate
// limiting — só o resultado do HMAC. O secret existe SOMENTE neste
// ambiente server-side (Edge Function), nunca no navegador, nunca
// logado, nunca enviado ao banco.
const RATE_LIMIT_HMAC_SECRET_ENV_VAR = "RATE_LIMIT_HMAC_SECRET";

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Extração do IP do cliente — MELHOR ESFORÇO, não uma garantia.
//
// NÃO existe, até hoje, documentação oficial da Supabase confirmando
// que "x-forwarded-for" chega sanitizado/sobrescrito pela própria
// plataforma. Relatos da comunidade (não confirmados por ninguém da
// equipe Supabase) indicam que a infraestrutura ANEXA o IP real do
// cliente como o ÚLTIMO hop da lista, sem necessariamente remover
// hops anteriores que o próprio cliente tenha enviado — ou seja, um
// cliente pode falsificar qualquer hop ANTES do último, mas não
// consegue (segundo esses relatos, não oficialmente garantidos)
// forjar o último. Por isso usamos sempre o ÚLTIMO hop, nunca o
// primeiro — e tratamos isso como um sinal de rate limiting
// best-effort, não como identidade confiável para qualquer decisão
// de segurança mais forte.
//
// Em desenvolvimento local (supabase functions serve) não existe
// nenhuma cadeia de proxy real — o header tende a vir ausente. O
// fallback abaixo existe só para não quebrar o fluxo localmente;
// nunca deveria ser alcançado em produção.
function extractClientIpBestEffort(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((hop) => hop.trim())
      .filter((hop) => hop.length > 0);
    if (hops.length > 0) {
      return hops[hops.length - 1].toLowerCase();
    }
  }
  return "local-dev-sem-x-forwarded-for";
}

// =========================================================
// Mapeamento de erros de public.create_booking_request -> HTTP
// =========================================================
// A função RPC sinaliza erros de negócio com "raise exception
// '<codigo>'" (ver migrations 002/006) — todos compartilham o mesmo
// SQLSTATE padrão (P0001), então o texto da mensagem É o identificador
// estável. Qualquer mensagem FORA desta lista (erro de conexão,
// violação de constraint inesperada, etc.) cai no default: 500
// genérico, SEM repassar o texto original do Postgres ao cliente.
interface MappedRpcError {
  status: number;
  code: string;
  message: string;
}

const RPC_ERROR_MAP: Record<string, MappedRpcError> = {
  idempotency_mismatch: {
    status: 409,
    code: "idempotency_mismatch",
    message: "Esta solicitação já foi utilizada com dados diferentes.",
  },
  limite_de_tentativas_excedido: {
    status: 429,
    code: "rate_limit_exceeded",
    message: "Muitas tentativas em um curto período. Tente novamente mais tarde.",
  },
  pacote_invalido: {
    status: 400,
    code: "package_not_found",
    message: "O pacote selecionado não está disponível.",
  },
  preco_indisponivel_para_local: {
    status: 400,
    code: "price_unavailable_for_location",
    message:
      "O pacote selecionado não tem preço disponível para a modalidade escolhida.",
  },
  horario_invalido: {
    status: 400,
    code: "invalid_schedule",
    message: "O horário solicitado é inválido para a duração deste pacote.",
  },
  // ttl_invalido nunca deveria ocorrer em operação normal (o TTL é
  // decidido só pelo backend, nunca pelo cliente) — se ocorrer, é bug
  // de configuração do servidor, não erro do cliente. Tratado como
  // erro interno genérico de propósito (nunca expõe "ttl_invalido",
  // que revelaria um parâmetro interno, ao cliente).
  ttl_invalido: {
    status: 500,
    code: "internal_error",
    message: "Erro interno. Tente novamente mais tarde.",
  },
};

const GENERIC_INTERNAL_ERROR: MappedRpcError = {
  status: 500,
  code: "internal_error",
  message: "Erro interno. Tente novamente mais tarde.",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Checagem BÁSICA de formato de e-mail, de propósito não-exaustiva
// (não é o lugar de reimplementar RFC 5322) — só para rejeitar lixo
// óbvio antes de qualquer uso futuro (ex.: envio de confirmação).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =========================================================
// CORS
// =========================================================
// Nunca "*". Fallback seguro (usado só quando ALLOWED_ORIGINS não
// está configurada) restrito a localhost — adequado para
// desenvolvimento local, NUNCA para produção. Antes de qualquer
// deploy real, ALLOWED_ORIGINS precisa ser definida explicitamente
// (ex.: "https://beautyos.com.br") via `supabase secrets set` — algo
// que esta tarefa não faz, porque não estamos fazendo deploy.
//
// CORS é independente da autenticação da API key: controla quais
// origins de NAVEGADOR podem LER a resposta, não substitui a
// validação da publishable key feita pelo @supabase/server.
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  if (configured && configured.trim().length > 0) {
    return configured
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
  return DEFAULT_DEV_ORIGINS;
}

function buildCorsHeaders(allowedOrigin: string | null): Record<string, string> {
  if (!allowedOrigin) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // "apikey" é o header que carrega a publishable key — precisa
    // estar liberado aqui para o preflight não bloquear a chamada
    // real. "authorization" fica reservado a um eventual JWT de
    // usuário real (não usado neste fluxo público hoje).
    "Access-Control-Allow-Headers": "apikey, authorization, content-type",
    "Vary": "Origin",
  };
}

// Retorna a origin exata a devolver no header (nunca "*"), ou null se
// a origin da requisição não está na lista permitida. Requisições SEM
// header Origin (ex.: curl, chamada servidor-a-servidor) não são
// bloqueadas aqui — CORS é um mecanismo de proteção do NAVEGADOR, não
// um mecanismo de autorização; ausência de Origin não é, por si só,
// um sinal de requisição ilegítima.
function resolveRequestOrigin(req: Request): {
  allowed: boolean;
  headerToUse: string | null;
} {
  const originHeader = req.headers.get("origin");
  if (!originHeader) {
    return { allowed: true, headerToUse: null };
  }

  const allowedOrigins = getAllowedOrigins();
  const allowed = allowedOrigins.includes(originHeader);
  return { allowed, headerToUse: allowed ? originHeader : null };
}

// =========================================================
// Resposta padronizada
// =========================================================

function jsonResponse(
  status: number,
  body: ApiErrorResponseBody | ApiSuccessResponseBody,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  corsHeaders: Record<string, string>,
  // Opcional: os pontos de rejeição ANTES do handler de negócio (CORS,
  // erro não tratado do próprio wrapper de autenticação) não têm um
  // requestId de uma requisição já em andamento — geramos um novo só
  // para manter a resposta consistente, em vez de omitir o campo.
  requestId: string = crypto.randomUUID(),
): Response {
  return jsonResponse(status, { ok: false, code, message, request_id: requestId }, corsHeaders);
}

function successResponse(
  bookingRequest: BookingRequestResponseData,
  corsHeaders: Record<string, string>,
): Response {
  return jsonResponse(200, { ok: true, booking_request: bookingRequest }, corsHeaders);
}

// =========================================================
// Normalização
// =========================================================

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

// Mantém dígitos e, se houver, um "+" inicial. Não assume DDD/tamanho
// brasileiro — só remove formatação (espaços, parênteses, hífens).
function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 0) return null;
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

// =========================================================
// Validações de formato
// =========================================================

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isValidCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Checagem grosseira de "não é passado", usando UTC. A autoridade
// final continua sendo o CHECK (event_date >= current_date) no
// Postgres, avaliado no timezone do banco — esta checagem aqui só
// falha rápido com uma mensagem melhor, não substitui a do banco.
function isTodayOrFutureUtc(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const requested = Date.UTC(year, month - 1, day);
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return requested >= todayUtc;
}

function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

// =========================================================
// Validação do payload completo
// =========================================================

type ValidationResult =
  | { ok: true; data: ValidatedBookingRequestInput }
  | { ok: false; code: string; message: string };

function validatePayload(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Corpo da requisição precisa ser um objeto JSON.",
    };
  }

  const payload = raw as Record<string, unknown>;

  // Whitelist estrita: qualquer campo fora da lista prevista é
  // rejeitado — inclui explicitamente qualquer tentativa de enviar
  // price/amount/status/booking_request_id/client_id etc. O
  // navegador nunca é a autoridade de preço; isso nem chega a ser
  // "ignorado", é motivo de rejeição da requisição inteira.
  for (const key of Object.keys(payload)) {
    if (!KNOWN_FIELDS.has(key as keyof RawBookingRequestPayload)) {
      return {
        ok: false,
        code: "unexpected_field",
        message: `Campo não permitido: '${key}'.`,
      };
    }
  }

  const p = payload as RawBookingRequestPayload;

  // client_request_id
  if (typeof p.client_request_id !== "string" || !isValidUuid(p.client_request_id)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'client_request_id' precisa ser um UUID válido.",
    };
  }

  // package_id
  if (typeof p.package_id !== "string" || !isValidUuid(p.package_id)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'package_id' precisa ser um UUID válido.",
    };
  }

  // location
  if (
    typeof p.location !== "string" ||
    !ALLOWED_LOCATIONS.has(p.location as BookingLocation)
  ) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'location' precisa ser 'studio' ou 'home'.",
    };
  }

  // event_date
  if (typeof p.event_date !== "string" || !isValidCalendarDate(p.event_date)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'event_date' precisa ser uma data válida (YYYY-MM-DD).",
    };
  }
  if (!isTodayOrFutureUtc(p.event_date)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'event_date' precisa ser hoje ou uma data futura.",
    };
  }

  // ready_time
  if (typeof p.ready_time !== "string" || !isValidTime(p.ready_time)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'ready_time' precisa ser um horário válido (HH:MM).",
    };
  }

  // name
  const name = normalizeString(p.name);
  if (!name || name.length > FIELD_LIMITS.name) {
    return {
      ok: false,
      code: "validation_error",
      message: `Campo 'name' é obrigatório e deve ter até ${FIELD_LIMITS.name} caracteres.`,
    };
  }

  // phone
  const phone = normalizePhone(p.phone);
  const phoneDigitCount = phone ? phone.replace(/\D/g, "").length : 0;
  if (
    !phone ||
    phoneDigitCount < FIELD_LIMITS.phoneDigitsMin ||
    phoneDigitCount > FIELD_LIMITS.phoneDigitsMax
  ) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'phone' é obrigatório e precisa ter um número de dígitos plausível.",
    };
  }

  // email (opcional)
  let email: string | null = null;
  if (p.email !== undefined && p.email !== null) {
    email = normalizeEmail(p.email);
    if (!email || email.length > FIELD_LIMITS.email || !EMAIL_RE.test(email)) {
      return {
        ok: false,
        code: "validation_error",
        message: "Campo 'email', quando enviado, precisa ser um e-mail válido.",
      };
    }
  }

  // address — obrigatório quando location = "home" (atendimento a
  // domicílio sem endereço não é um estado válido de negócio, mesmo
  // regra já aplicada em public.bookings via CHECK), e PROIBIDO
  // quando location = "studio" (create_booking_request descarta
  // silenciosamente qualquer address recebido para "studio" — ver
  // migration 002, seção 6 — mas esta API rejeita explicitamente em
  // vez de aceitar um campo que seria ignorado sem aviso).
  const addressProvided = p.address !== undefined && p.address !== null;
  const address = addressProvided ? normalizeString(p.address) : null;

  if (p.location === "home") {
    if (!address || address.length > FIELD_LIMITS.address) {
      return {
        ok: false,
        code: "validation_error",
        message: `Campo 'address' é obrigatório para location = 'home' e deve ter até ${FIELD_LIMITS.address} caracteres.`,
      };
    }
  } else if (addressProvided) {
    return {
      ok: false,
      code: "validation_error",
      message: "Campo 'address' só é permitido quando location = 'home'.",
    };
  }

  // notes (opcional)
  let notes: string | null = null;
  if (p.notes !== undefined && p.notes !== null) {
    notes = normalizeString(p.notes);
    if (notes && notes.length > FIELD_LIMITS.notes) {
      return {
        ok: false,
        code: "validation_error",
        message: `Campo 'notes', quando enviado, deve ter até ${FIELD_LIMITS.notes} caracteres.`,
      };
    }
  }

  return {
    ok: true,
    data: {
      clientRequestId: p.client_request_id,
      packageId: p.package_id,
      location: p.location as BookingLocation,
      eventDate: p.event_date,
      readyTime: p.ready_time,
      name,
      phone,
      email,
      address,
      notes,
    },
  };
}

// =========================================================
// Handler de negócio — SÓ roda depois que @supabase/server já
// validou a publishable key no header "apikey". Nada aqui reabre ou
// reimplementa essa checagem.
// =========================================================

// =========================================================
// Chamada isolada a public.create_booking_request — ÚNICO ponto
// deste arquivo que usa ctx.supabaseAdmin (service_role). Nunca
// reutilizado para mais nada, de propósito: mantém o uso da
// credencial administrativa auditável num só lugar.
// =========================================================

interface CreateBookingRequestParams {
  clientRequestId: string;
  packageId: string;
  location: BookingLocation;
  eventDate: string;
  readyTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  address: string | null;
  notes: string | null;
  ipHash: string;
  phoneHash: string;
  reservationTtlMinutes: number;
}

type RpcOutcome =
  | { kind: "success"; data: Record<string, unknown> }
  | { kind: "error"; mapped: MappedRpcError; logCategory: string };

async function callCreateBookingRequest(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  params: CreateBookingRequestParams,
): Promise<RpcOutcome> {
  const { data, error } = await supabaseAdmin.rpc("create_booking_request", {
    p_client_request_id: params.clientRequestId,
    p_package_id: params.packageId,
    p_location: params.location,
    p_event_date: params.eventDate,
    p_ready_time: params.readyTime,
    p_client_name: params.clientName,
    p_client_phone: params.clientPhone,
    p_client_email: params.clientEmail,
    p_address: params.address,
    p_notes: params.notes,
    p_ip_hash: params.ipHash,
    p_phone_hash: params.phoneHash,
    p_reservation_ttl_minutes: params.reservationTtlMinutes,
  });

  if (error) {
    // "raise exception '<codigo>'" chega aqui com error.message igual
    // ao <codigo> (ver migrations 002/006) — NUNCA interpolado com
    // dado de negócio/PII, por desenho da própria função. Qualquer
    // mensagem fora do mapa conhecido é tratada como erro interno
    // genérico; o texto original do Postgres nunca é usado na
    // resposta, só (sanitizado) no log.
    const rawMessage = typeof error.message === "string" ? error.message.trim() : "";
    const mapped = RPC_ERROR_MAP[rawMessage];
    return {
      kind: "error",
      mapped: mapped ?? GENERIC_INTERNAL_ERROR,
      logCategory: mapped ? rawMessage : "rpc_unknown_error",
    };
  }

  return { kind: "success", data: data as Record<string, unknown> };
}

// Whitelist explícita do retorno da RPC — nunca repassamos o objeto
// jsonb do banco direto ao cliente. "conflito" só traz id+status (ver
// migration 002, seção 7); os demais campos ficam omitidos nesse caso.
function buildBookingRequestResponseData(
  rpcResult: Record<string, unknown>,
): BookingRequestResponseData {
  const result: BookingRequestResponseData = {
    id: rpcResult.booking_request_id,
    status: rpcResult.status,
  };
  if ("expires_at" in rpcResult) result.expires_at = rpcResult.expires_at;
  if ("price_cents" in rpcResult) result.price_cents = rpcResult.price_cents;
  if ("duration_minutes" in rpcResult) {
    result.duration_minutes = rpcResult.duration_minutes;
  }
  if ("start_time" in rpcResult) result.start_time = rpcResult.start_time;
  return result;
}

// deno-lint-ignore no-explicit-any
async function bookingRequestHandler(req: Request, ctx: any): Promise<Response> {
  // corsHeaders é recalculado aqui (não recebido de fora) porque este
  // handler também pode ser chamado isoladamente em teste unitário,
  // sem passar pelo wrapper externo de CORS — ver função exportada
  // "fetch" mais abaixo, que é quem de fato aplica os headers na
  // resposta final enviada ao navegador.
  const { headerToUse } = resolveRequestOrigin(req);
  const corsHeaders = buildCorsHeaders(headerToUse);

  // Correlaciona esta requisição com os logs internos, sem nunca
  // conter PII — devolvido ao cliente em toda resposta de erro.
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return errorResponse(
      405,
      "method_not_allowed",
      "Método não permitido. Use POST.",
      corsHeaders,
      requestId,
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(
      415,
      "unsupported_media_type",
      "Content-Type precisa ser application/json.",
      corsHeaders,
      requestId,
    );
  }

  // Corta cedo se o Content-Length já denunciar um corpo grande
  // demais, antes de gastar tempo lendo o corpo inteiro.
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      "payload_too_large",
      "Corpo da requisição excede o tamanho máximo permitido.",
      corsHeaders,
      requestId,
    );
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return errorResponse(
      400,
      "invalid_body",
      "Não foi possível ler o corpo da requisição.",
      corsHeaders,
      requestId,
    );
  }

  // Defesa adicional: Content-Length pode estar ausente ou ser
  // inconsistente com o corpo real recebido.
  if (rawText.length > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      "payload_too_large",
      "Corpo da requisição excede o tamanho máximo permitido.",
      corsHeaders,
      requestId,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Corpo da requisição não é um JSON válido.",
      corsHeaders,
      requestId,
    );
  }

  const validation = validatePayload(parsed);
  if (!validation.ok) {
    // Log SEM PII: só o code (e authMode, que não é PII), nunca o
    // valor de nenhum campo recebido, nunca o payload inteiro.
    console.warn("[booking-request] validation_failed", {
      code: validation.code,
      authMode: ctx?.authMode ?? "unknown",
      request_id: requestId,
    });
    return errorResponse(400, validation.code, validation.message, corsHeaders, requestId);
  }

  // A partir daqui, "validation.data" contém o payload já validado e
  // normalizado. nome/telefone/e-mail/endereço/notas existem só em
  // memória, nunca logados a partir daqui em diante.
  const data = validation.data;

  // Rate limiting: secret HMAC server-side. Se não estiver configurado
  // (nunca deveria faltar fora de um ambiente mal configurado), FALHA
  // FECHADO — nunca chamamos a RPC com um hash vazio/inventado, o que
  // violaria a coluna NOT NULL de rate_limit_attempts.identifier_hash
  // e propagaria um erro bruto do Postgres.
  const hmacSecret = Deno.env.get(RATE_LIMIT_HMAC_SECRET_ENV_VAR);
  if (!hmacSecret) {
    console.error("[booking-request] config_missing", {
      detail: "rate_limit_hmac_secret_not_set",
      request_id: requestId,
    });
    return errorResponse(
      500,
      GENERIC_INTERNAL_ERROR.code,
      GENERIC_INTERNAL_ERROR.message,
      corsHeaders,
      requestId,
    );
  }

  const reservationTtlMinutes = getReservationTtlMinutes();
  if (reservationTtlMinutes === null) {
    console.error("[booking-request] config_invalid", {
      detail: "reservation_ttl_out_of_range",
      request_id: requestId,
    });
    return errorResponse(
      500,
      GENERIC_INTERNAL_ERROR.code,
      GENERIC_INTERNAL_ERROR.message,
      corsHeaders,
      requestId,
    );
  }

  // IP só em memória, nunca logado em texto puro — só o HMAC viaja
  // para fora desta função (para o banco, via RPC).
  const clientIp = extractClientIpBestEffort(req);
  const [ipHash, phoneHash] = await Promise.all([
    hmacSha256Hex(hmacSecret, clientIp),
    hmacSha256Hex(hmacSecret, data.phone),
  ]);

  // create_booking_request já chama check_and_record_rate_limit
  // INTERNAMENTE (migration 002, seção 6) sob o mesmo dono SECURITY
  // DEFINER — esta função NUNCA chama check_and_record_rate_limit
  // diretamente, para não consumir/duplicar a mesma tentativa.
  const outcome = await callCreateBookingRequest(ctx.supabaseAdmin, {
    clientRequestId: data.clientRequestId,
    packageId: data.packageId,
    location: data.location,
    eventDate: data.eventDate,
    readyTime: data.readyTime,
    clientName: data.name,
    clientPhone: data.phone,
    clientEmail: data.email,
    address: data.address,
    notes: data.notes,
    ipHash,
    phoneHash,
    reservationTtlMinutes,
  });

  if (outcome.kind === "error") {
    // Log SANITIZADO: só a categoria conhecida (ou "rpc_unknown_error")
    // e o request_id — NUNCA o texto original do Postgres (poderia
    // conter nome de tabela/constraint em erros inesperados) e NUNCA
    // nenhum campo do payload.
    console.error("[booking-request] rpc_error", {
      category: outcome.logCategory,
      request_id: requestId,
    });
    return errorResponse(
      outcome.mapped.status,
      outcome.mapped.code,
      outcome.mapped.message,
      corsHeaders,
      requestId,
    );
  }

  // TODO(fase-2 — disponibilidade / Google Calendar):
  //   create_booking_request já faz a checagem final server-side
  //   (bookings confirmados + EXCLUDE entre booking_requests ativas).
  //   Uma consulta ao Google Calendar seria só um sinal ANTECIPADO,
  //   não implementada nesta fase.

  // TODO(fase-2 — PIX):
  //   Só depois de uma booking_request 'aguardando_pagamento' criada
  //   com sucesso: gerar a cobrança PIX (Santander) e devolver o QR
  //   code ao frontend. Fora de escopo desta etapa.

  return successResponse(buildBookingRequestResponseData(outcome.data), corsHeaders);
}

// withSupabase({ auth: 'publishable' }) valida, ANTES de
// bookingRequestHandler rodar, que a requisição carrega uma
// publishable key válida deste projeto no header "apikey". Se não
// carregar (ausente, inválida, de outro projeto), o próprio wrapper
// rejeita a requisição — nenhuma lógica de autenticação manual é
// escrita neste arquivo.
const authenticatedHandler = withSupabase(
  { auth: "publishable" },
  bookingRequestHandler,
);

// =========================================================
// Entry point
// =========================================================
// Padrão atual do @supabase/server: exportar um objeto com "fetch",
// não Deno.serve(...) diretamente — withSupabase(...) já devolve um
// handler (Request) => Promise<Response> compatível com essa forma.
export default {
  fetch: async (req: Request): Promise<Response> => {
    const { allowed: originAllowed, headerToUse } = resolveRequestOrigin(req);
    const corsHeaders = buildCorsHeaders(headerToUse);

    // Preflight nunca deve exigir autenticação — navegadores não
    // enviam o header "apikey" real numa requisição OPTIONS.
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Uma origin PRESENTE mas fora da lista permitida é rejeitada
    // explicitamente, antes mesmo de checar a API key — CORS por si
    // só não bloqueia a requisição no servidor (só impede o
    // navegador de LER a resposta), então reforçamos aqui.
    if (!originAllowed) {
      return errorResponse(403, "origin_not_allowed", "Origem não autorizada.", {});
    }

    // Gerado aqui (não dentro de bookingRequestHandler) porque este
    // catch também cobre falhas que acontecem ANTES de
    // bookingRequestHandler rodar (ex.: dentro do próprio wrapper de
    // autenticação) — só correlaciona log <-> resposta, nunca PII.
    const requestId = crypto.randomUUID();

    let response: Response;
    try {
      // Delega a AUTENTICAÇÃO da publishable key inteiramente ao
      // wrapper oficial — se a chave estiver ausente/errada, a
      // resposta de rejeição vem de dentro de authenticatedHandler,
      // sem que bookingRequestHandler chegue a rodar.
      response = await authenticatedHandler(req);
    } catch {
      // NUNCA logar a exceção em si (message/stack/cause/String(error)
      // ou o objeto "error"): uma exceção de biblioteca/runtime pode
      // conter URL, trecho de SQL, headers ou outro dado que não
      // controlamos. Só uma categoria fixa e o request_id — nenhum
      // detalhe da exceção real sai daqui, nem para o log nem para a
      // resposta (que já era genérica).
      console.error("[booking-request] unhandled_error", {
        category: "unexpected_exception",
        request_id: requestId,
      });
      return errorResponse(
        500,
        "internal_error",
        "Erro interno. Tente novamente mais tarde.",
        corsHeaders,
        requestId,
      );
    }

    // Anexa os headers de CORS já calculados à resposta produzida
    // pelo wrapper (seja ela de rejeição de API key, seja do handler
    // de negócio) — sem presumir o formato exato da resposta interna
    // do @supabase/server.
    const responseWithCors = new Response(response.body, response);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseWithCors.headers.set(key, value);
    }
    return responseWithCors;
  },
};
