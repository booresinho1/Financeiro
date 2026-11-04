-- Conciliação da fila do Pluggy: de que conta veio, número da parcela e a qual
-- lançamento do app (despesa ou entrada) a transação foi vinculada.
-- Rodar no SQL Editor do Supabase, depois de pluggy-tabelas.sql.

alter table transacoes_pendentes
  add column if not exists tipo_conta text,
  add column if not exists parcela_numero int,
  add column if not exists parcela_total int,
  add column if not exists data_compra date,
  add column if not exists id_lancamento text;
