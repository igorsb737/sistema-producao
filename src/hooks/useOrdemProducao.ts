import { ref, push, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useState, useEffect } from 'react';

interface Grade {
  codigo: string;
  produtoId: string;
  nome: string;
  quantidadePrevista: number;
  entregas: number[];
}

interface Grades {
  [key: string]: Grade;
}

interface Item {
  nome: string;
  produtoId: string;
}

interface Previsoes {
  malha: string;
  ribana: string;
}

interface Solicitacao {
  item: Item;
  malha: Item;
  ribana: Item;
  previsoes: Previsoes;
}

interface InformacoesGerais {
  numero: string;
  cliente: string;
  dataEntrega: string;
  dataInicio: string;
  dataFechamento?: string;
  status: Status;
  observacao?: string;
  totalCamisetas: number;
}

export type Status = 'Rascunho' | 'Aberta' | 'Finalizado';

export interface OrdemProducao {
  id: string;
  informacoesGerais: InformacoesGerais;
  solicitacao: Solicitacao;
  grades: Grades;
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
            const dateA = new Date(a.informacoesGerais.dataInicio.split('-').reverse().join('-')).getTime();
            const dateB = new Date(b.informacoesGerais.dataInicio.split('-').reverse().join('-')).getTime();
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

  interface CriarOrdemInput {
    informacoesGerais: {
      cliente: string;
      dataInicio: string;
      dataEntrega: string;
      status: Status;
      observacao?: string;
      totalCamisetas: number;
    };
    solicitacao: Solicitacao;
    grades: Grades;
  }

  const criarOrdem = async (ordem: CriarOrdemInput) => {
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
        id: novaOrdemRef.key || '',
        informacoesGerais: {
          ...ordem.informacoesGerais,
          numero: proximoNumero.toString().padStart(4, '0'),
        },
        solicitacao: ordem.solicitacao,
        grades: ordem.grades
      };

      await set(novaOrdemRef, {
        informacoesGerais: novaOrdem.informacoesGerais,
        solicitacao: novaOrdem.solicitacao,
        grades: novaOrdem.grades
      });
      
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
          informacoesGerais: {
            ...ordemAtual.informacoesGerais,
            status: 'Finalizado' as Status,
            dataFechamento: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
          }
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

  const editarOrdem = async (id: string, ordem: CriarOrdemInput) => {
    try {
      const ordemRef = ref(database, `ordens/${id}`);
      const snapshot = await get(ordemRef);
      if (snapshot.exists()) {
        const ordemAtual = snapshot.val();
        await set(ordemRef, {
          informacoesGerais: {
            ...ordem.informacoesGerais,
            numero: ordemAtual.informacoesGerais.numero,
          },
          solicitacao: ordem.solicitacao,
          grades: ordem.grades
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
