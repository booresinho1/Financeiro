create or replace view projecao_orcamento as
with periodo as (
  select
    date_trunc('month', current_date)::date as inicio_mes,
    (date_trunc('month', current_date) + interval '1 month')::date as inicio_prox_mes,
    extract(day from current_date)::int as dias_passados,
    extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as dias_no_mes
),
gasto as (
  select d.user_id, d.categoria, sum(d.valor) as gasto_atual
  from despesas d, periodo p
  where d.data >= p.inicio_mes and d.data < p.inicio_prox_mes
  group by d.user_id, d.categoria
)
select
  o.user_id,
  o.categoria,
  o.valor_orcado as orcamento,
  coalesce(g.gasto_atual, 0) as gasto_atual,
  p.dias_passados,
  p.dias_no_mes,
  (p.dias_no_mes - p.dias_passados) as dias_restantes,
  round(coalesce(g.gasto_atual, 0) / p.dias_passados, 2) as ritmo_diario_atual,
  round(o.valor_orcado - coalesce(g.gasto_atual, 0), 2) as disponivel_restante,
  round(
    case
      when (p.dias_no_mes - p.dias_passados) > 0
        then (o.valor_orcado - coalesce(g.gasto_atual, 0)) / (p.dias_no_mes - p.dias_passados)
      else o.valor_orcado - coalesce(g.gasto_atual, 0)
    end,
    2
  ) as disponivel_por_dia,
  round(coalesce(g.gasto_atual, 0) / p.dias_passados * p.dias_no_mes, 2) as projecao_fim_mes,
  (coalesce(g.gasto_atual, 0) / p.dias_passados * p.dias_no_mes) > o.valor_orcado as vai_estourar
from orcamentos o
cross join periodo p
left join gasto g on g.user_id = o.user_id and g.categoria = o.categoria;
