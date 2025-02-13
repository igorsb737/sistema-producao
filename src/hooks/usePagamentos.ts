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

export interface Pagamento {
  id: string;
  lancamentos: Lancamento[];
}

export const usePagamentos = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buscarPagamentos = async (orderId: string): Promise<Pagamento[]> => {
    try {
      const pagamentosRef = ref(database, `ordens/${orderId}/pagamentos`);
      const snapshot = await get(pagamentosRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();
      return Object.entries(data).map(([id, pagamento]) => ({
        id,
        ...(pagamento as Omit<Pagamento, 'id'>),
      }));
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

  return {
    loading,
    error,
    buscarPagamentos,
    adicionarPagamento,
    calcularTotalPago,
  };
};
