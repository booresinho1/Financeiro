import { sheetsService } from '@/services/sheetsService'
import type {
  BancoConectado,
  CartaoResumo,
  ContaPluggy,
  PluggyItem,
  TransacaoPendente,
} from '@/types/finance'

export const pluggyRepository = {
  obterConnectToken: () =>
    sheetsService.criar<{ accessToken: string }>('pluggy-token', {}).then((r) => r.accessToken),

  listarItens: () => sheetsService.listar<PluggyItem[]>('pluggy-itens'),

  salvarItem: (itemId: string) => sheetsService.criar<PluggyItem>('pluggy-itens', { itemId }),

  excluirItem: (id: string) => sheetsService.excluir('pluggy-itens', id),

  sincronizar: (opcoes: { desde: string; tipos: string[] }) =>
    sheetsService.criar<{ novas: number; contas: ContaPluggy[] }>('pluggy-sincronizar', opcoes),

  listarSaldos: () => sheetsService.listar<BancoConectado[]>('pluggy-saldos'),

  listarCartoes: () => sheetsService.listar<CartaoResumo[]>('pluggy-cartoes'),

  listarPendentes: () => sheetsService.listar<TransacaoPendente[]>('transacoes-pendentes'),

  atualizarPendente: (t: TransacaoPendente) =>
    sheetsService.atualizar<TransacaoPendente>('transacoes-pendentes', t.id, t),
}
