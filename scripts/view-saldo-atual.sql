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
  ) as saldo_atual
from contas c
where c.ativa = true;
