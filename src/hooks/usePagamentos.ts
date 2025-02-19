import { useState, useEffect } from 'react';
import { ref, get, set, push, child } from 'firebase/database';
import { database } from '../config/firebase';

export interface Lancamento {
  fornecedorId: string;
  servicoId: string;
  valor: number;
  quantidade: number;
  total: number;
  data: string;
  afetaEstoque?: boolean;
}

export interface ConciliacaoPagamento {
  dataPagamento: string;
  dataConciliacao: string;
  status: 'Pendente' | 'Enviado' | 'Pago';
  total: number;
  lancamentosSelecionados: Array<{
    index: number;
    valor: number;
    quantidade: number;
    servicoId: string;
  }>;
}

export interface Pagamento {
  id: string;
  lancamentos: Lancamento[];
  conciliacao?: ConciliacaoPagamento;
}

interface TotaisConciliados {
  quantidade: number;
  valor: number;
}

export const usePagamentos = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buscarPagamentos = async (orderId: string, apenasNaoConciliados: boolean = false): Promise<Pagamento[]> => {
    try {
      const pagamentosRef = ref(database, `ordens/${orderId}/pagamentos`);
      const snapshot = await get(pagamentosRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();
      const pagamentos = Object.entries(data).map(([id, pagamento]) => ({
        id,
        ...(pagamento as Omit<Pagamento, 'id'>),
      }));

      if (apenasNaoConciliados) {
        return pagamentos.filter(pagamento => !pagamento.conciliacao);
      }

      return pagamentos;
    } catch (err) {
      console.error('Erro ao buscar pagamentos:', err);
      throw new Error('Erro ao buscar pagamentos');
    }
  };

  const adicionarPagamento = async (orderId: string, pagamento: Omit<Pagamento, 'id'>) => {
    try {
      const pagamentosRef = ref(database, `ordens/${orderId}/pagamentos`);
      const novoPagamentoRef = push(pagamentosRef);
      await set(novoPagamentoRef, pagamento);
    } catch (err) {
      console.error('Erro ao adicionar pagamento:', err);
      throw new Error('Erro ao adicionar pagamento');
    }
  };

  const calcularTotalPago = (pagamentos: Pagamento[]) => {
    return pagamentos.reduce(
      (acc, pagamento) => {
        const totaisPagamento = pagamento.lancamentos.reduce(
          (lancAcc, lancamento) => ({
            quantidade: lancAcc.quantidade + (lancamento.afetaEstoque ? lancamento.quantidade : 0),
            valor: lancAcc.valor + lancamento.total,
          }),
          { quantidade: 0, valor: 0 }
        );

        return {
          quantidade: acc.quantidade + totaisPagamento.quantidade,
          valor: acc.valor + totaisPagamento.valor,
        };
      },
      { quantidade: 0, valor: 0 }
    );
  };

  const buscarPagamentosPorFornecedor = async (fornecedorId: string): Promise<Array<{ordemId: string; pagamento: Pagamento}>> => {
    try {
      const ordensRef = ref(database, 'ordens');
      const snapshot = await get(ordensRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const pagamentosPorFornecedor: Array<{ordemId: string; pagamento: Pagamento}> = [];
      
      const ordensData = snapshot.val();
      
      for (const [ordemId, ordem] of Object.entries<any>(ordensData)) {
        if (ordem && typeof ordem === 'object' && 'pagamentos' in ordem) {
          const pagamentos = ordem.pagamentos;
          
          if (pagamentos && typeof pagamentos === 'object') {
            for (const [pagamentoId, pagamento] of Object.entries<any>(pagamentos)) {
              if (pagamento && Array.isArray(pagamento.lancamentos)) {
                const temLancamentosFornecedor = pagamento.lancamentos.some(
                  (l: Lancamento) => l.fornecedorId === fornecedorId
                );

                if (temLancamentosFornecedor && !pagamento.conciliacao) {
                  pagamentosPorFornecedor.push({
                    ordemId,
                    pagamento: {
                      id: pagamentoId,
                      lancamentos: pagamento.lancamentos.filter(
                        (l: Lancamento) => l.fornecedorId === fornecedorId
                      ),
                      conciliacao: pagamento.conciliacao
                    }
                  });
                }
              }
            }
          }
        }
      }

      return pagamentosPorFornecedor;
    } catch (err) {
      console.error('Erro ao buscar pagamentos por fornecedor:', err);
      throw new Error('Erro ao buscar pagamentos por fornecedor');
    }
  };

  const criarConciliacao = async (
    fornecedorId: string,
    dataPagamento: string,
    lancamentosSelecionados: Array<{
      ordemId: string;
      pagamentoId: string;
      lancamentoIndex: number;
      valor: number;
      quantidade: number;
      servicoId: string;
    }>
  ): Promise<void> => {
    try {
      const dataConciliacao = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');

      // Agrupar lançamentos por ordem e pagamento
      const lancamentosPorPagamento = lancamentosSelecionados.reduce((acc, lancamento) => {
        const key = `${lancamento.ordemId}/${lancamento.pagamentoId}`;
        if (!acc[key]) {
          acc[key] = {
            ordemId: lancamento.ordemId,
            pagamentoId: lancamento.pagamentoId,
            lancamentos: []
          };
        }
        acc[key].lancamentos.push({
          index: lancamento.lancamentoIndex,
          valor: lancamento.valor,
          quantidade: lancamento.quantidade,
          servicoId: lancamento.servicoId
        });
        return acc;
      }, {} as Record<string, {
        ordemId: string;
        pagamentoId: string;
        lancamentos: Array<{index: number; valor: number; quantidade: number; servicoId: string}>;
      }>);

      // Atualizar cada pagamento com sua conciliação
      for (const { ordemId, pagamentoId, lancamentos } of Object.values(lancamentosPorPagamento)) {
        const pagamentoRef = ref(
          database,
          `ordens/${ordemId}/pagamentos/${pagamentoId}`
        );

        const conciliacao: ConciliacaoPagamento = {
          dataPagamento,
          dataConciliacao,
          status: 'Pendente',
          total: lancamentos.reduce((sum, l) => sum + l.valor, 0),
          lancamentosSelecionados: lancamentos
        };

        const snapshot = await get(pagamentoRef);
        if (snapshot.exists()) {
          const pagamentoAtual = snapshot.val();
          await set(pagamentoRef, {
            ...pagamentoAtual,
            conciliacao
          });
        }
      }
    } catch (err) {
      console.error('Erro ao criar conciliação:', err);
      throw new Error('Erro ao criar conciliação');
    }
  };

  const atualizarStatusConciliacao = async (
    ordemId: string,
    pagamentoId: string,
    novoStatus: 'Pendente' | 'Enviado' | 'Pago'
  ) => {
    try {
      const pagamentoRef = ref(
        database,
        `ordens/${ordemId}/pagamentos/${pagamentoId}`
      );
      
      const snapshot = await get(pagamentoRef);
      if (snapshot.exists()) {
        const pagamento = snapshot.val() as Pagamento;
        if (pagamento.conciliacao) {
          await set(pagamentoRef, {
            ...pagamento,
            conciliacao: {
              ...pagamento.conciliacao,
              status: novoStatus
            }
          });
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status da conciliação:', err);
      throw new Error('Erro ao atualizar status da conciliação');
    }
  };

  const buscarTotaisConciliados = async (ordemId: string): Promise<TotaisConciliados> => {
    try {
      const pagamentosRef = ref(database, `ordens/${ordemId}/pagamentos`);
      const snapshot = await get(pagamentosRef);
      
      if (!snapshot.exists()) {
        return { quantidade: 0, valor: 0 };
      }

      const pagamentos = Object.values(snapshot.val() as Record<string, Pagamento>);
      
      const totais = pagamentos.reduce((acc, pagamento) => {
        if (pagamento.conciliacao) {
          return {
            quantidade: acc.quantidade + pagamento.conciliacao.lancamentosSelecionados.reduce((sum, lanc) => sum + (lanc.quantidade || 0), 0),
            valor: acc.valor + pagamento.conciliacao.total
          };
        }
        return acc;
      }, { quantidade: 0, valor: 0 });

      return totais;
    } catch (err) {
      console.error('Erro ao buscar totais conciliados:', err);
      return { quantidade: 0, valor: 0 };
    }
  };

  return {
    loading,
    error,
    buscarPagamentos,
    adicionarPagamento,
    calcularTotalPago,
    buscarPagamentosPorFornecedor,
    criarConciliacao,
    atualizarStatusConciliacao,
    buscarTotaisConciliados,
  };
};
