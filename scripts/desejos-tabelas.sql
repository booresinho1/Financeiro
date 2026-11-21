-- Módulo Desejos: classes, desejos (e os já realizados) e a configuração de cada usuário.
-- Rodar no SQL Editor do Supabase. Pode rodar mais de uma vez.

create table if not exists desejos_classes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  nome text not null,
  emoji text not null default '⭐',
  exemplo text not null default '',
  peso numeric not null default 1 check (peso > 0 and peso <= 5),
  pode_parcelar boolean not null default true,
  so_sobra_livre boolean not null default false,
  posicao integer not null default 0,
  primary key (user_id, id)
);

create table if not exists desejos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  nome text not null,
  classe text not null,
  valor numeric not null check (valor >= 0),
  tipo text not null default 'UNICO' check (tipo in ('UNICO', 'MENSAL')),
  parcelas_n integer check (parcelas_n is null or parcelas_n > 0),
  parcelas_valor numeric check (parcelas_valor is null or parcelas_valor >= 0),
  vida_util_meses integer check (vida_util_meses is null or vida_util_meses > 0),
  g smallint not null check (g between 1 and 5),
  u smallint not null check (u between 1 and 5),
  t smallint not null check (t between 1 and 5),
  data_desejada date,
  alternativa numeric check (alternativa is null or alternativa >= 0),
  link text check (link is null or link ~* '^https?://'),
  observacao text,
  imagem text check (imagem is null or imagem ~* '^https?://'),
  -- dinheiro guardado só para este desejo (fora do separado livre)
  reservado numeric not null default 0 check (reservado >= 0),
  criado_em timestamptz not null default now(),
  -- preenchidos quando o desejo é realizado (vira conquista)
  realizado_em date,
  valor_pago numeric check (valor_pago is null or valor_pago >= 0),
  descontado numeric not null default 0,
  primary key (user_id, id)
);

-- para quem já tinha criado a tabela antes desta coluna existir
alter table desejos add column if not exists reservado numeric not null default 0 check (reservado >= 0);

create table if not exists desejos_config (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  guardado numeric not null default 0,
  ordem text not null default 'importancia' check (ordem in ('importancia', 'custoBeneficio')),
  sobra_manual numeric
);

alter table desejos_classes enable row level security;
alter table desejos enable row level security;
alter table desejos_config enable row level security;

drop policy if exists "desejos_classes_dono" on desejos_classes;
create policy "desejos_classes_dono" on desejos_classes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "desejos_dono" on desejos;
create policy "desejos_dono" on desejos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "desejos_config_dono" on desejos_config;
create policy "desejos_config_dono" on desejos_config
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
