import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useState } from 'react';
import { useOrdemProducao } from './useOrdemProducao';

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
    ribanaUsada: number,
    totalCamisetasEntregue: number
  ) => {
    setLoading(true);
    try {
      // Verifica se já existe lançamento para esta ordem
      const ordemRef = ref(database, `ordens/${ordemId}`);
      const snapshot = await get(ordemRef);
      
      if (!snapshot.exists()) {
        throw new Error('Ordem não encontrada');
      }

      const ordemAtual = snapshot.val();
      
      if (ordemAtual.lancamentoMalha) {
        throw new Error('Já existe um lançamento para esta ordem');
      }

      // Calcula o rendimento
      const rendimento = calcularRendimento(totalCamisetasEntregue, malhaUsada);

      // Atualiza a ordem com o lançamento de malha
      await set(ordemRef, {
        ...ordemAtual,
        lancamentoMalha: {
          malhaUsada,
          ribanaUsada,
          dataLancamento: new Date().toLocaleDateString('pt-BR'),
          rendimento
        }
      });

      // Finaliza a ordem
      await finalizarOrdem(ordemId);

      setError(null);
      return {
        malhaUsada,
        ribanaUsada,
        dataLancamento: new Date().toLocaleDateString('pt-BR'),
        rendimento
      };
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
      const ordemRef = ref(database, `ordens/${ordemId}`);
      const snapshot = await get(ordemRef);
      
      if (snapshot.exists()) {
        const ordem = snapshot.val();
        return ordem.lancamentoMalha || null;
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
