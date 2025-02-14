import { useState, useEffect } from 'react';
import { ref, get, set, push, child } from 'firebase/database';
import { database } from '../config/firebase';

export interface Conciliacao {
  id: string;
  data: string;
  status: 'Pendente' | 'Enviado' | 'Pago';
}

export interface Lancamento {
  fornecedorId: string;
  servicoId: string;
  valor: number;
  quantidade: number;
  total: number;
  data: string;
  afetaEstoque?: boolean;
  conciliacao?: Conciliacao;
}

export interface Pagamento {
  id: string;
  lancamentos: Lancamento[];
}

export interface ConciliacaoCompleta {
  id: string;
  fornecedorId: string;
  dataPagamento: string;
  dataConciliacao: string;
  status: 'Pendente' | 'Enviado' | 'Pago';
  lancamentos: {
    ordemId: string;
    pagamentoId: string;
    lancamentoIndex: number;
    valor: number;
  }[];
  total: number;
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
        return pagamentos.map(pagamento => ({
          ...pagamento,
          lancamentos: pagamento.lancamentos.filter(l => !l.conciliacao)
        })).filter(p => p.lancamentos.length > 0);
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
      
      const ordensData = snapshot.val() as Record<string, {
        pagamentos?: Record<string, {
          lancamentos: Lancamento[];
        }>;
      }>;
      
      for (const [ordemId, ordem] of Object.entries(ordensData)) {
        if (ordem?.pagamentos) {
          const pagamentosOrdem = Object.entries(ordem.pagamentos)
            .map(([id, pagamento]) => ({
              id,
              ...(pagamento as Omit<Pagamento, 'id'>),
            }))
            .filter(pagamento => 
              pagamento.lancamentos.some(l => 
                l.fornecedorId === fornecedorId && !l.conciliacao
              )
            );

          pagamentosOrdem.forEach(pagamento => {
            pagamentosPorFornecedor.push({
              ordemId,
              pagamento: {
                ...pagamento,
                lancamentos: pagamento.lancamentos.filter(
                  l => l.fornecedorId === fornecedorId && !l.conciliacao
                )
              }
            });
          });
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
    }>
  ): Promise<string> => {
    try {
      // Criar nova conciliação
      const conciliacoesRef = ref(database, 'conciliacoes');
      const novaConciliacaoRef = push(conciliacoesRef);
      const conciliacaoId = novaConciliacaoRef.key!;
      
      const dataConciliacao = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');

      const conciliacao: ConciliacaoCompleta = {
        id: conciliacaoId,
        fornecedorId,
        dataPagamento,
        dataConciliacao,
        status: 'Pendente',
        lancamentos: lancamentosSelecionados,
        total: lancamentosSelecionados.reduce((acc, l) => acc + l.valor, 0)
      };

      // Salvar conciliação
      await set(novaConciliacaoRef, conciliacao);

      // Atualizar lançamentos com a conciliação
      for (const lancamento of lancamentosSelecionados) {
        const lancamentoRef = ref(
          database,
          `ordens/${lancamento.ordemId}/pagamentos/${lancamento.pagamentoId}/lancamentos/${lancamento.lancamentoIndex}`
        );

        const conciliacaoInfo: Conciliacao = {
          id: conciliacaoId,
          data: dataConciliacao,
          status: 'Pendente'
        };

        const snapshot = await get(lancamentoRef);
        if (snapshot.exists()) {
          const lancamentoAtual = snapshot.val();
          await set(lancamentoRef, {
            ...lancamentoAtual,
            conciliacao: conciliacaoInfo
          });
        }
      }

      return conciliacaoId;
    } catch (err) {
      console.error('Erro ao criar conciliação:', err);
      throw new Error('Erro ao criar conciliação');
    }
  };

  const atualizarStatusConciliacao = async (
    conciliacaoId: string,
    novoStatus: 'Pendente' | 'Enviado' | 'Pago'
  ) => {
    try {
      // Atualizar status na conciliação
      const conciliacaoRef = ref(database, `conciliacoes/${conciliacaoId}`);
      const snapshot = await get(conciliacaoRef);
      
      if (snapshot.exists()) {
        const conciliacao = snapshot.val() as ConciliacaoCompleta;
        await set(conciliacaoRef, {
          ...conciliacao,
          status: novoStatus
        });

        // Atualizar status em todos os lançamentos vinculados
        for (const lancamento of conciliacao.lancamentos) {
          const lancamentoRef = ref(
            database,
            `ordens/${lancamento.ordemId}/pagamentos/${lancamento.pagamentoId}/lancamentos/${lancamento.lancamentoIndex}/conciliacao`
          );
          await set(lancamentoRef, {
            id: conciliacaoId,
            data: conciliacao.dataConciliacao,
            status: novoStatus
          });
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status da conciliação:', err);
      throw new Error('Erro ao atualizar status da conciliação');
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
  };
};
