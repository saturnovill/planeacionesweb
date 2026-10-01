
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null default '',
  contenidos jsonb not null default '[]'  -- [{grado, contenido, pda, marcas[]}]
);

create table public.planeaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null check (tipo in ('clases', 'proyecto')),
  escuela text not null check (escuela in ('27', '21')),
  grado int not null check (grado between 1 and 3),
  grupos text not null,
  periodo_inicio date not null,
  periodo_fin date not null,
  metodologia text,
  instrucciones text not null default '',
  seleccion jsonb not null default '[]',      -- [{contenido, pda}]
  sesiones_input jsonb not null default '[]', -- [{tipo, nota}]
  resultado jsonb,
  actividades jsonb,
  created_at timestamptz not null default now()
);

create index on public.planeaciones (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.planeaciones enable row level security;

create policy "perfil propio" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "planeaciones propias" on public.planeaciones
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
