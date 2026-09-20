create or replace function simular_meta(
  p_user_id uuid,
  p_data_alvo date,
  p_valor_alvo numeric,
  p_meses_historico int default 3
)
returns table (
  saldo_hoje numeric,
  entradas_previstas numeric,
  parcelas_a_pagar numeric,
  custos_fixos_a_pagar numeric,
  gasto_variavel_medio_mensal numeric,
  gasto_variavel_estimado numeric,
  meses_ate_alvo numeric,
  saldo_projetado numeric,
  sobra_apos_meta numeric,
  cabe boolean,
  falta numeric,
  economia_mensal_necessaria numeric
)
language sql
stable
as $$
with base as (
  select greatest((p_data_alvo - current_date)::numeric / 30.0, 0) as meses
),
saldo as (
  select coalesce(sum(saldo_atual), 0) as v
  from saldo_atual_contas
  where user_id = p_user_id
),
entradas_fut as (
  select coalesce(sum(valor), 0) as v
  from entradas
  where user_id = p_user_id
    and status = 'PREVISTA'
    and data > current_date
    and data <= p_data_alvo
),
parcelas_fut as (
  select coalesce(sum(p.valor_previsto), 0) as v
  from parcelas p
  join dividas d on d.id = p.id_divida
  where d.user_id = p_user_id
    and p.status in ('PENDENTE', 'ATRASADA')
    and p.data_vencimento <= p_data_alvo
),
custos_fixos_mes as (
  select coalesce(sum(valor_previsto), 0) as v
  from custos_fixos
  where user_id = p_user_id
    and ativo = true
    and data_inicio <= p_data_alvo
    and (data_fim is null or data_fim >= current_date)
),
-- média do gasto variável: exclui despesas que são espelho de parcela ou custo fixo,
-- senão esses valores entrariam duas vezes na projeção
variavel as (
  select coalesce(sum(de.valor), 0) / p_meses_historico as v
  from despesas de
  where de.user_id = p_user_id
    and de.data >= (date_trunc('month', current_date) - make_interval(months => p_meses_historico))::date
    and de.data < date_trunc('month', current_date)::date
    and not exists (select 1 from parcelas p where p.id_despesa = de.id)
    and not exists (select 1 from pagamentos_custos_fixos pg where pg.id_despesa = de.id)
),
calc as (
  select
    b.meses,
    s.v as saldo_hoje,
    e.v as entradas_previstas,
    pa.v as parcelas_a_pagar,
    cf.v * b.meses as custos_fixos_a_pagar,
    va.v as gasto_variavel_medio_mensal,
    va.v * b.meses as gasto_variavel_estimado
  from base b, saldo s, entradas_fut e, parcelas_fut pa, custos_fixos_mes cf, variavel va
),
final as (
  select
    c.*,
    c.saldo_hoje + c.entradas_previstas
      - c.parcelas_a_pagar - c.custos_fixos_a_pagar - c.gasto_variavel_estimado as saldo_projetado
  from calc c
)
select
  round(saldo_hoje, 2),
  round(entradas_previstas, 2),
  round(parcelas_a_pagar, 2),
  round(custos_fixos_a_pagar, 2),
  round(gasto_variavel_medio_mensal, 2),
  round(gasto_variavel_estimado, 2),
  round(meses, 2),
  round(saldo_projetado, 2),
  round(saldo_projetado - p_valor_alvo, 2),
  saldo_projetado >= p_valor_alvo,
  greatest(round(p_valor_alvo - saldo_projetado, 2), 0),
  case
    when meses > 0 then greatest(round((p_valor_alvo - saldo_projetado) / meses, 2), 0)
    else 0
  end
from final;
$$;

-- só o n8n (service_role) pode chamar; ninguém consegue passar um user_id arbitrário pela API pública
revoke execute on function simular_meta(uuid, date, numeric, int) from anon, authenticated;
