import { ref, push, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useState, useEffect } from 'react';

interface Grade {
  codigo: string;
  quantidadePrevista: number;
  entregas: number[];
}

export interface OrdemProducao {
  id: string;
  numero: string;
  dataInicio: string;
  dataFechamento?: string;
  dataEntrega: string;
  status: 'Rascunho' | 'Aberta' | 'Finalizado';
  totalCamisetas: number;
  rendimento?: number;
  cliente: string;
  item: string;
  malha: string;
  consumoMalha?: number;
  previsaoMalha?: string;
  ribana: string;
  consumoRibana?: number;
  previsaoRibana?: string;
  grades: Grade[];
  observacao?: string;
}

export const useOrdemProducao = () => {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarOrdens = async () => {
    try {
      const ordensRef = ref(database, 'ordens');
      const snapshot = await get(ordensRef);
      
      if (snapshot.exists()) {
        const ordensData = snapshot.val();
        console.log('Dados do Firebase:', ordensData);
        const ordensArray = Object.entries(ordensData)
          .map(([key, value]) => ({
            ...value as Omit<OrdemProducao, 'id'>,
            id: key
          }))
          .sort((a, b) => {
            // Converte as datas para timestamp para comparação
            const dateA = new Date(a.dataInicio.split('-').reverse().join('-')).getTime();
            const dateB = new Date(b.dataInicio.split('-').reverse().join('-')).getTime();
            return dateB - dateA; // Ordem decrescente (mais recente primeiro)
          });
        console.log('Array de ordens mapeado e ordenado:', ordensArray);
        setOrdens(ordensArray);
      } else {
        setOrdens([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens');
    } finally {
      setLoading(false);
    }
  };

  const criarOrdem = async (ordem: Omit<OrdemProducao, 'numero'>) => {
    try {
      // Buscar o próximo número da sequência
      const configRef = ref(database, 'config/numeroSequencial');
      const configSnapshot = await get(configRef);
      const numeroAtual = configSnapshot.exists() ? configSnapshot.val() : 0;
      const proximoNumero = numeroAtual + 1;

      // Atualizar o número sequencial
      await set(configRef, proximoNumero);

      // Criar a ordem com o número sequencial
      const ordensRef = ref(database, 'ordens');
      const novaOrdemRef = push(ordensRef);
      
      const novaOrdem: OrdemProducao = {
        ...ordem,
        numero: proximoNumero.toString().padStart(4, '0'),
        status: ordem.status || 'Aberta',
        totalCamisetas: ordem.grades.reduce((total, grade) => total + grade.quantidadePrevista, 0),
      };

      await set(novaOrdemRef, novaOrdem);
      await carregarOrdens();
      
      return novaOrdem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ordem');
      throw err;
    }
  };

  const finalizarOrdem = async (id: string) => {
    try {
      const ordemRef = ref(database, `ordens/${id}`);
      const snapshot = await get(ordemRef);
      if (snapshot.exists()) {
        const ordemAtual = snapshot.val();
        await set(ordemRef, {
          ...ordemAtual,
          status: 'Finalizado',
          dataFechamento: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
        });
      }
      await carregarOrdens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar ordem');
      throw err;
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, []);

  const editarOrdem = async (id: string, ordem: Omit<OrdemProducao, 'numero'>) => {
    try {
      const ordemRef = ref(database, `ordens/${id}`);
      const snapshot = await get(ordemRef);
      if (snapshot.exists()) {
        const ordemAtual = snapshot.val();
        await set(ordemRef, {
          ...ordem,
          numero: ordemAtual.numero,
        });
      }
      await carregarOrdens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar ordem');
      throw err;
    }
  };

  return {
    ordens,
    loading,
    error,
    criarOrdem,
    finalizarOrdem,
    editarOrdem,
    recarregarOrdens: carregarOrdens,
  };
};
