-- Projeta o saldo mês a mês, 12 meses à frente, separando conta operacional de reserva.
-- Responde "se eu continuar assim, onde vou parar?" e "quando a reserva acaba?".

-- saldo_atual_contas ganha eh_reserva no fim da lista (create or replace aceita
-- coluna nova no fim; reordenar exigiria drop)
create or replace view saldo_atual_contas as
select
  c.id,
  c.user_id,
  c.nome,
  c.tipo,
  (
    c.saldo_inicial
    + coalesce((
        select sum(
          case
            when m.tipo = 'ENTRADA' and m.conta = c.nome then m.valor
            when m.tipo = 'RETIRADA' and m.conta = c.nome then -m.valor
            when m.tipo = 'TRANSFERENCIA' and m.conta_destino = c.nome then m.valor
            when m.tipo = 'TRANSFERENCIA' and m.conta_origem = c.nome then -m.valor
            else 0
          end
        )
        from movimentacoes m
        where m.user_id = c.user_id
          and (c.data_saldo_inicial is null or m.data >= c.data_saldo_inicial)
      ), 0)
    + case when c.tipo = 'AUTOMATICA' then
        coalesce((
          select sum(e.valor)
          from entradas e
          where e.user_id = c.user_id
            and e.status = 'RECEBIDA'
            and e.conta_destino = c.nome
            and (c.data_saldo_inicial is null or e.data >= c.data_saldo_inicial)
        ), 0)
        - coalesce((
          select sum(d.valor)
          from despesas d
          where d.user_id = c.user_id
            and (c.data_saldo_inicial is null or d.data >= c.data_saldo_inicial)
        ), 0)
      else 0
    end
  ) as saldo_atual,
  c.eh_reserva
from contas c
where c.ativa = true;


drop view if exists trajetoria_saldo;

create view trajetoria_saldo as
with params as (
  select 12 as meses_a_frente, 3 as meses_historico
),
hoje as (
  select
    current_date as data_hoje,
    date_trunc('month', current_date)::date as mes_atual,
    extract(day from current_date)::int as dias_passados,
    extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as dias_no_mes,
    to_char(current_date, 'YYYY-MM') as periodo_ref
),
meses as (
  select generate_series(
    (select mes_atual from hoje),
    (select mes_atual from hoje) + make_interval(months => (select meses_a_frente from params) - 1),
    interval '1 month'
  )::date as mes_ref
),
usuarios as (
  select distinct user_id from contas where ativa = true
),
grid as (
  select u.user_id, m.mes_ref from usuarios u cross join meses m
),
-- saldo de partida, separado por finalidade da conta
saldo_inicial as (
  select
    user_id,
    coalesce(sum(saldo_atual) filter (where not eh_reserva), 0) as operacional,
    coalesce(sum(saldo_atual) filter (where eh_reserva), 0) as reserva
  from saldo_atual_contas
  group by user_id
),
variavel as (
  select
    d.user_id,
    coalesce(sum(d.valor), 0) / (select meses_historico from params) as media_mensal
  from despesas d
  where d.data >= ((select mes_atual from hoje) - make_interval(months => (select meses_historico from params)))
    and d.data < (select mes_atual from hoje)
    and not exists (select 1 from parcelas pa where pa.id_despesa = d.id)
    and not exists (select 1 from pagamentos_custos_fixos pg where pg.id_despesa = d.id)
  group by d.user_id
),
-- renda média dos meses já fechados, usada onde não há entrada cadastrada
renda_media as (
  select user_id, avg(total_mes) as media_mensal
  from (
    select e.user_id, date_trunc('month', e.data)::date as mes, sum(e.valor) as total_mes
    from entradas e
    where e.status = 'RECEBIDA'
      and e.data < (select mes_atual from hoje)
    group by e.user_id, date_trunc('month', e.data)
  ) t
  group by user_id
),
-- entradas ainda não recebidas: no mês corrente conta a partir do dia 1,
-- porque o salário da quinzena pode estar datado em dia já passado
entradas_mes as (
  select
    e.user_id,
    date_trunc('month', e.data)::date as mes_ref,
    sum(e.valor) as v
  from entradas e
  where e.status = 'PREVISTA'
    and e.data >= (select mes_atual from hoje)
  group by e.user_id, date_trunc('month', e.data)
),
-- parcela vencida e não paga cai no mês corrente: ainda é dívida
parcelas_mes as (
  select
    dv.user_id,
    greatest(date_trunc('month', pa.data_vencimento)::date, (select mes_atual from hoje)) as mes_ref,
    sum(pa.valor_previsto) as v
  from parcelas pa
  join dividas dv on dv.id = pa.id_divida
  where pa.status in ('PENDENTE', 'ATRASADA')
  group by dv.user_id, greatest(date_trunc('month', pa.data_vencimento)::date, (select mes_atual from hoje))
),
custos_mes as (
  select cf.user_id, m.mes_ref, sum(cf.valor_previsto) as v
  from custos_fixos cf
  cross join meses m
  where cf.ativo = true
    and cf.data_inicio < (m.mes_ref + interval '1 month')
    and (cf.data_fim is null or cf.data_fim >= m.mes_ref)
    and (
      m.mes_ref > (select mes_atual from hoje)
      or not exists (
        select 1 from pagamentos_custos_fixos pg
        where pg.id_custo_fixo = cf.id and pg.periodo = (select periodo_ref from hoje)
      )
    )
  group by cf.user_id, m.mes_ref
),
fluxo as (
  select
    g.user_id,
    g.mes_ref,
    -- no mês corrente só entra o que ainda não caiu; o recebido já está no saldo,
    -- então aqui nunca se usa a média (ela duplicaria o salário já creditado)
    case
      when g.mes_ref = h.mes_atual then coalesce(e.v, 0)
      else coalesce(e.v, coalesce(rm.media_mensal, 0))
    end as entradas,
    (g.mes_ref > h.mes_atual and e.v is null) as entrada_estimada,
    coalesce(pm.v, 0) as parcelas,
    coalesce(cm.v, 0) as custos_fixos,
    case
      when g.mes_ref = h.mes_atual
        then coalesce(va.media_mensal, 0) * (h.dias_no_mes - h.dias_passados)::numeric / h.dias_no_mes
      else coalesce(va.media_mensal, 0)
    end as gasto_variavel
  from grid g
  cross join hoje h
  left join entradas_mes e  on e.user_id  = g.user_id and e.mes_ref  = g.mes_ref
  left join parcelas_mes pm on pm.user_id = g.user_id and pm.mes_ref = g.mes_ref
  left join custos_mes cm   on cm.user_id = g.user_id and cm.mes_ref = g.mes_ref
  left join variavel va     on va.user_id = g.user_id
  left join renda_media rm  on rm.user_id = g.user_id
),
acumulado as (
  select
    f.*,
    si.reserva,
    f.entradas - f.parcelas - f.custos_fixos - f.gasto_variavel as resultado_mes,
    coalesce(si.operacional, 0) + sum(f.entradas - f.parcelas - f.custos_fixos - f.gasto_variavel)
      over (partition by f.user_id order by f.mes_ref
            rows between unbounded preceding and current row) as saldo_operacional
  from fluxo f
  left join saldo_inicial si on si.user_id = f.user_id
)
select
  user_id,
  mes_ref,
  round(entradas, 2) as entradas_previstas,
  entrada_estimada,
  round(parcelas, 2) as parcelas,
  round(custos_fixos, 2) as custos_fixos,
  round(gasto_variavel, 2) as gasto_variavel_estimado,
  round(resultado_mes, 2) as resultado_mes,
  round(saldo_operacional, 2) as saldo_operacional,
  -- a reserva só é consumida depois que o operacional fica negativo
  round(greatest(coalesce(reserva, 0) + least(saldo_operacional, 0), 0), 2) as reserva_restante,
  (saldo_operacional < 0) as usando_reserva,
  (coalesce(reserva, 0) + least(saldo_operacional, 0) <= 0) as reserva_esgotada
from acumulado
order by user_id, mes_ref;
