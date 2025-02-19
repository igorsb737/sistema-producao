import { ref, push, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useState } from 'react';
import { useOrdemProducao } from './useOrdemProducao';

interface LancamentoMalha {
  id: string;
  ordemId: string;
  malhaUsada: number;
  dataLancamento: string;
  rendimento: number;
}

export const useLancamentoMalha = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { finalizarOrdem } = useOrdemProducao();

  const calcularRendimento = (totalCamisetasEntregue: number, malhaUsada: number): number => {
    return totalCamisetasEntregue / malhaUsada;
  };

  const lancarMalha = async (
    ordemId: string,
    malhaUsada: number,
    totalCamisetasEntregue: number
  ) => {
    setLoading(true);
    try {
      // Verifica se já existe lançamento para esta ordem
      const lancamentosRef = ref(database, 'lancamentosMalha');
      const snapshot = await get(lancamentosRef);
      
      if (snapshot.exists()) {
        const lancamentos = snapshot.val();
        const lancamentoExistente = Object.values(lancamentos).find(
          (l: any) => l.ordemId === ordemId
        );
        
        if (lancamentoExistente) {
          throw new Error('Já existe um lançamento para esta ordem');
        }
      }

      // Calcula o rendimento
      const rendimento = calcularRendimento(totalCamisetasEntregue, malhaUsada);

      // Cria o novo lançamento
      const novoLancamentoRef = push(lancamentosRef);
      const novoLancamento: LancamentoMalha = {
        id: novoLancamentoRef.key || '',
        ordemId,
        malhaUsada,
        dataLancamento: new Date().toLocaleDateString('pt-BR'),
        rendimento
      };

      await set(novoLancamentoRef, novoLancamento);

      // Finaliza a ordem
      await finalizarOrdem(ordemId);

      setError(null);
      return novoLancamento;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao lançar malha';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const buscarLancamentoPorOrdem = async (ordemId: string) => {
    try {
      const lancamentosRef = ref(database, 'lancamentosMalha');
      const snapshot = await get(lancamentosRef);
      
      if (snapshot.exists()) {
        const lancamentos = snapshot.val();
        const lancamento = Object.values(lancamentos).find(
          (l: any) => l.ordemId === ordemId
        );
        
        return lancamento as LancamentoMalha || null;
      }
      
      return null;
    } catch (err) {
      console.error('Erro ao buscar lançamento:', err);
      return null;
    }
  };

  return {
    loading,
    error,
    lancarMalha,
    buscarLancamentoPorOrdem
  };
};
