-- drop antes de recriar: a view mudou de colunas e o Postgres não permite
-- reordenar/renomear com "create or replace view" (erro 42P16)
drop view if exists projecao_orcamento;

create view projecao_orcamento as
with periodo as (
  select
    date_trunc('month', current_date)::date as inicio_mes,
    (date_trunc('month', current_date) + interval '1 month')::date as inicio_prox_mes,
    extract(day from current_date)::int as dias_passados,
    extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as dias_no_mes,
    to_char(current_date, 'YYYY-MM') as periodo_ref
),
-- gasto do mês, separando o que é variável (não veio de parcela nem de custo fixo)
gasto as (
  select
    d.user_id,
    d.categoria,
    sum(d.valor) as gasto_atual,
    coalesce(sum(d.valor) filter (
      where not exists (select 1 from parcelas p where p.id_despesa = d.id)
        and not exists (select 1 from pagamentos_custos_fixos pg where pg.id_despesa = d.id)
    ), 0) as gasto_variavel_atual
  from despesas d
  cross join periodo p
  where d.data >= p.inicio_mes and d.data < p.inicio_prox_mes
  group by d.user_id, d.categoria
),
-- parcelas ainda não pagas com vencimento até o fim do mês (inclui atrasadas de meses anteriores)
parcelas_restantes as (
  select
    dv.user_id,
    dv.categoria,
    sum(pa.valor_previsto) as valor
  from parcelas pa
  join dividas dv on dv.id = pa.id_divida
  cross join periodo p
  where pa.status in ('PENDENTE', 'ATRASADA')
    and pa.data_vencimento < p.inicio_prox_mes
    and dv.categoria is not null
  group by dv.user_id, dv.categoria
),
-- custos fixos ativos que ainda não têm pagamento registrado neste período
custos_restantes as (
  select
    cf.user_id,
    cf.categoria,
    sum(cf.valor_previsto) as valor
  from custos_fixos cf
  cross join periodo p
  where cf.ativo = true
    and cf.data_inicio < p.inicio_prox_mes
    and (cf.data_fim is null or cf.data_fim >= p.inicio_mes)
    and not exists (
      select 1 from pagamentos_custos_fixos pg
      where pg.id_custo_fixo = cf.id
        and pg.periodo = p.periodo_ref
    )
  group by cf.user_id, cf.categoria
),
calc as (
  select
    o.user_id,
    o.categoria,
    o.valor_orcado as orcamento,
    coalesce(g.gasto_atual, 0) as gasto_atual,
    coalesce(g.gasto_variavel_atual, 0) as gasto_variavel_atual,
    coalesce(pr.valor, 0) + coalesce(cr.valor, 0) as compromissos_restantes,
    p.dias_passados,
    p.dias_no_mes,
    (p.dias_no_mes - p.dias_passados) as dias_restantes
  from orcamentos o
  cross join periodo p
  left join gasto g            on g.user_id  = o.user_id and g.categoria  = o.categoria
  left join parcelas_restantes pr on pr.user_id = o.user_id and pr.categoria = o.categoria
  left join custos_restantes cr   on cr.user_id = o.user_id and cr.categoria = o.categoria
),
projecao as (
  select
    c.*,
    round(c.gasto_variavel_atual / c.dias_passados, 2) as ritmo_variavel_diario,
    round(
      c.gasto_atual
      + c.compromissos_restantes
      + (c.gasto_variavel_atual / c.dias_passados) * c.dias_restantes
    , 2) as projecao_fim_mes
  from calc c
)
select
  user_id,
  categoria,
  orcamento,
  gasto_atual,
  gasto_variavel_atual,
  compromissos_restantes,
  dias_passados,
  dias_no_mes,
  dias_restantes,
  ritmo_variavel_diario,
  round(orcamento - gasto_atual, 2) as disponivel_restante,
  -- o que sobra por dia já descontando o que está comprometido e ainda vai cair
  round(
    case
      when dias_restantes > 0
        then (orcamento - gasto_atual - compromissos_restantes) / dias_restantes
      else orcamento - gasto_atual - compromissos_restantes
    end
  , 2) as disponivel_por_dia,
  projecao_fim_mes,
  (projecao_fim_mes > orcamento) as vai_estourar,
  round(projecao_fim_mes - orcamento, 2) as estouro_previsto
from projecao;
