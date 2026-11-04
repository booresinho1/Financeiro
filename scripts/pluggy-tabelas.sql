-- Integração Pluggy: conexões bancárias e fila de transações a categorizar.
-- Rodar no SQL Editor do Supabase.

create table if not exists pluggy_itens (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id text not null,
  conector text,
  criado_em timestamptz not null default now(),
  unique (user_id, item_id)
);

create table if not exists transacoes_pendentes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pluggy_id text not null,
  item_id text not null,
  conta_pluggy text,
  data date not null,
  descricao text not null,
  valor numeric not null,
  tipo text not null check (tipo in ('ENTRADA', 'DESPESA')),
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'IMPORTADA', 'IGNORADA')),
  unique (user_id, pluggy_id)
);

alter table pluggy_itens enable row level security;
alter table transacoes_pendentes enable row level security;

create policy "pluggy_itens_dono" on pluggy_itens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "transacoes_pendentes_dono" on transacoes_pendentes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
