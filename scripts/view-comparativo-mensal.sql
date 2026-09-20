-- drop antes de recriar: a view ganhou colunas no meio da lista, e o Postgres
-- não permite reordenar colunas com "create or replace view" (erro 42P16)
drop view if exists comparativo_mensal;

create view comparativo_mensal as
with totais as (
  select
    d.user_id,
    date_trunc('month', d.data)::date as mes_ref,
    d.categoria,
    sum(d.valor) as total_mes,
    coalesce(
      sum(d.valor) filter (
        where extract(day from d.data) <= extract(day from current_date)
      ), 0
    ) as total_ate_dia
  from despesas d
  group by d.user_id, date_trunc('month', d.data), d.categoria

  union all

  select
    d.user_id,
    date_trunc('month', d.data)::date as mes_ref,
    'TOTAL' as categoria,
    sum(d.valor) as total_mes,
    coalesce(
      sum(d.valor) filter (
        where extract(day from d.data) <= extract(day from current_date)
      ), 0
    ) as total_ate_dia
  from despesas d
  group by d.user_id, date_trunc('month', d.data)
)
select
  user_id,
  mes_ref,
  categoria,
  (mes_ref = date_trunc('month', current_date)::date) as mes_em_andamento,

  -- comparação de mês cheio: válida quando o mês já fechou
  round(total_mes, 2) as total_mes,
  round(lag(total_mes) over w, 2) as total_mes_anterior,
  round(total_mes - coalesce(lag(total_mes) over w, 0), 2) as variacao_valor,
  round(
    case
      when coalesce(lag(total_mes) over w, 0) = 0 then null
      else (total_mes - lag(total_mes) over w) / lag(total_mes) over w * 100
    end
  , 1) as variacao_percentual,

  -- comparação proporcional: mesmo intervalo de dias nos dois meses,
  -- para o mês em andamento não parecer melhor só por estar incompleto
  round(total_ate_dia, 2) as total_ate_dia,
  round(lag(total_ate_dia) over w, 2) as total_mes_anterior_ate_dia,
  round(total_ate_dia - coalesce(lag(total_ate_dia) over w, 0), 2) as variacao_valor_proporcional,
  round(
    case
      when coalesce(lag(total_ate_dia) over w, 0) = 0 then null
      else (total_ate_dia - lag(total_ate_dia) over w) / lag(total_ate_dia) over w * 100
    end
  , 1) as variacao_percentual_proporcional
from totais
window w as (partition by user_id, categoria order by mes_ref)
order by user_id, categoria, mes_ref;
