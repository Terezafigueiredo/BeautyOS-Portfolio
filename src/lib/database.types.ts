// Tipos do banco de dados do BeautyOS no Supabase.
//
// Escritos à mão para acompanhar exatamente o schema em
// "supabase/schema.sql". Se o schema mudar, atualize este arquivo
// junto (ou substitua por `supabase gen types typescript` quando o
// projeto Supabase já existir).

export type BookingStatus =
  | "pendente"
  | "confirmado"
  | "recusado"
  | "cancelado";

export type BookingLocation = "studio" | "home";

// Um perfil por usuário do Supabase Auth. is_admin só pode ser
// promovido manualmente no SQL Editor — nunca pela API pública
// (veja as políticas de RLS em supabase/schema.sql).
export type ProfileRow = {
  id: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<ProfileInsert>;

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceInsert = {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ServiceUpdate = Partial<ServiceInsert>;

export type PackageRow = {
  id: string;
  service_id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  includes: string[];
  studio_price: number | null;
  home_price: number | null;
  fixed_price: number | null;
  duration_minutes: number;
  duration_label: string | null;
  is_highlighted: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PackageInsert = {
  id?: string;
  service_id: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  includes?: string[];
  studio_price?: number | null;
  home_price?: number | null;
  fixed_price?: number | null;
  duration_minutes: number;
  duration_label?: string | null;
  is_highlighted?: boolean;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PackageUpdate = Partial<PackageInsert>;

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientInsert = {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClientUpdate = Partial<ClientInsert>;

export type BookingRow = {
  id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  service_id: string | null;
  service_name: string;
  package_id: string | null;
  package_name: string;
  location: BookingLocation;
  address: string | null;
  event_date: string;
  ready_time: string;
  start_time: string;
  duration_minutes: number;
  price: number;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

// Formato de criação usado pelo formulário público: apenas os campos
// que a política "bookings_public_insert" permite preencher. client_id
// nunca é enviado pelo público (fica sempre nulo nesta etapa) e o
// status é sempre "pendente" — o próprio banco recusa qualquer outro
// valor nesse insert via RLS.
export type PublicBookingInsert = {
  client_name: string;
  client_phone: string;
  service_id?: string | null;
  service_name: string;
  package_id?: string | null;
  package_name: string;
  location: BookingLocation;
  address?: string | null;
  event_date: string;
  ready_time: string;
  start_time: string;
  duration_minutes: number;
  price: number;
  notes?: string | null;
};

// Formato de criação completo, para uso futuro do painel administrativo
// autenticado (pode definir client_id e status).
export type BookingInsert = PublicBookingInsert & {
  id?: string;
  client_id?: string | null;
  status?: BookingStatus;
  created_at?: string;
  updated_at?: string;
};

export type BookingUpdate = Partial<BookingInsert>;

export type BlockedSlotRow = {
  id: string;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockedSlotInsert = {
  id?: string;
  blocked_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BlockedSlotUpdate = Partial<BlockedSlotInsert>;

// Formato usado pelo cliente tipado do Supabase
// (createClient<Database>(...)). Cada tabela precisa de "Relationships"
// (exigido pelo @supabase/postgrest-js) além de Row/Insert/Update; como
// não usamos select() com joins/embeds, fica como lista vazia.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: ServiceInsert;
        Update: ServiceUpdate;
        Relationships: [];
      };
      packages: {
        Row: PackageRow;
        Insert: PackageInsert;
        Update: PackageUpdate;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: BookingInsert;
        Update: BookingUpdate;
        Relationships: [];
      };
      blocked_slots: {
        Row: BlockedSlotRow;
        Insert: BlockedSlotInsert;
        Update: BlockedSlotUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    // is_admin() e handle_new_user() existem no banco só para uso
    // interno das políticas de RLS/gatilhos — não são chamadas via
    // supabase.rpc() pelo frontend, por isso não entram aqui.
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
      booking_location: BookingLocation;
    };
  };
};
