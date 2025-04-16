import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { useState, useEffect } from 'react';

interface Recebimento {
  quantidade: number;
  data: string;
}

export interface Lancamento {
  data: string;
  quantidade: number;
  valor: number;
  servicoId: string;
}

interface Conciliacao {
  dataConciliacao: string;
  dataPagamento: string;
  lancamentos: {
    [key: string]: {
      quantidade: number;
      valor: number;
    };
  };
  lancamentosNaoConciliados: {
    [key: string]: {
      quantidade: number;
      valor: number;
    };
  };
}

interface Grade {
  codigo: string;
  produtoId: string;
  nome: string;
  quantidadePrevista: number;
  entregas: number[];
  recebimentos?: Recebimento[];
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

export type Status = 'Rascunho' | 'Aberta' | 'Em Entrega' | 'Finalizado';

interface LancamentoMalha {
  malhaUsada: number;
  ribanaUsada: number;
  dataLancamento: string;
  rendimento: number;
}

export interface OrdemProducao {
  id: string;
  informacoesGerais: InformacoesGerais;
  solicitacao: Solicitacao;
  grades: Grades;
  pagamentos: {
    [key: string]: Lancamento;
  };
  conciliacao: Conciliacao | null;
  lancamentoMalha: LancamentoMalha | null;
}

export const useOrdemProducao = () => {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarOrdens = async () => {
    console.log('Iniciando carregamento de ordens...');
    try {
      const ordensRef = ref(database, 'ordens');
      console.log('Referência do Firebase criada:', ordensRef);
      
      const snapshot = await get(ordensRef);
      console.log('Snapshot obtido:', snapshot.exists() ? 'Com dados' : 'Sem dados');
      
      if (snapshot.exists()) {
        const ordensData = snapshot.val();
        console.log('Dados brutos do Firebase:', JSON.stringify(ordensData, null, 2));
        
        const ordensArray = Object.entries(ordensData)
          .map(([key, value]) => {
            console.log(`\nProcessando ordem ${key}:`, JSON.stringify(value, null, 2));
            const ordem = value as Omit<OrdemProducao, 'id'>;
            
            if (!ordem.informacoesGerais || !ordem.solicitacao) {
              console.error(`Ordem ${key} com estrutura inválida:`, ordem);
              return null;
            }

            try {
              const ordemProcessada = {
                id: key,
                informacoesGerais: ordem.informacoesGerais,
                solicitacao: ordem.solicitacao,
                grades: ordem.grades || {},
                pagamentos: ordem.pagamentos || {},
                conciliacao: ordem.conciliacao || null,
                lancamentoMalha: ordem.lancamentoMalha || null
              };
              console.log(`Ordem ${key} processada com sucesso:`, JSON.stringify(ordemProcessada, null, 2));
              return ordemProcessada;
            } catch (processError) {
              console.error(`Erro ao processar ordem ${key}:`, processError);
              return null;
            }
          })
          .filter((ordem): ordem is OrdemProducao => {
            if (!ordem || !ordem.informacoesGerais || !ordem.solicitacao || !ordem.grades) {
              return false;
            }
            return true;
          })
          .sort((a, b) => {
            try {
              if (!a || !b) return 0;
              const dateA = new Date(a.informacoesGerais.dataInicio.split('-').reverse().join('-')).getTime();
              const dateB = new Date(b.informacoesGerais.dataInicio.split('-').reverse().join('-')).getTime();
              return dateB - dateA;
            } catch (sortError) {
              console.error('Erro ao ordenar:', sortError);
              return 0;
            }
          });

        console.log('Array final de ordens:', JSON.stringify(ordensArray, null, 2));
        setOrdens(ordensArray);
      } else {
        console.log('Nenhuma ordem encontrada no Firebase');
        setOrdens([]);
      }
    } catch (err) {
      console.error('Erro ao carregar ordens:', err);
      if (err instanceof Error) {
        console.error('Detalhes do erro:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      setError(err instanceof Error ? `Erro ao carregar ordens: ${err.message}` : 'Erro ao carregar ordens');
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
        grades: ordem.grades,
        pagamentos: {},
        conciliacao: null,
        lancamentoMalha: null
      };

      await set(novaOrdemRef, {
        informacoesGerais: novaOrdem.informacoesGerais,
        solicitacao: novaOrdem.solicitacao,
        grades: novaOrdem.grades,
        pagamentos: novaOrdem.pagamentos,
          conciliacao: novaOrdem.conciliacao,
          lancamentoMalha: novaOrdem.lancamentoMalha
      });
      
      await carregarOrdens();
      return novaOrdem;
    } catch (err) {
      console.error('Erro ao criar ordem:', err);
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
      console.error('Erro ao finalizar ordem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao finalizar ordem');
      throw err;
    }
  };

  const excluirOrdem = async (id: string) => {
    try {
      const ordemRef = ref(database, `ordens/${id}`);
      await remove(ordemRef);
      await carregarOrdens();
    } catch (err) {
      console.error('Erro ao excluir ordem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir ordem');
      throw err;
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
          grades: ordem.grades,
          pagamentos: ordemAtual.pagamentos || {},
          conciliacao: ordemAtual.conciliacao || null,
          lancamentoMalha: ordemAtual.lancamentoMalha || null
        });
      }
      await carregarOrdens();
    } catch (err) {
      console.error('Erro ao editar ordem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao editar ordem');
      throw err;
    }
  };

  const registrarRecebimento = async (
    ordemId: string,
    gradeId: string,
    recebimento: Recebimento
  ) => {
    try {
      const ordemRef = ref(database, `ordens/${ordemId}`);
      const snapshot = await get(ordemRef);
      
      if (snapshot.exists()) {
        const ordemAtual = snapshot.val();
        const grade = ordemAtual.grades[gradeId];
        
        // Inicializa o array de recebimentos se não existir
        if (!grade.recebimentos) {
          grade.recebimentos = [];
        }
        
        // Adiciona o novo recebimento
        grade.recebimentos.push(recebimento);
        
        // Atualiza a grade e o status da ordem no Firebase
        await set(ref(database, `ordens/${ordemId}`), {
          ...ordemAtual,
          grades: {
            ...ordemAtual.grades,
            [gradeId]: grade
          },
          informacoesGerais: {
            ...ordemAtual.informacoesGerais,
            status: 'Em Entrega' as Status
          }
        });
      }
      
      await carregarOrdens();
    } catch (err) {
      console.error('Erro ao registrar recebimento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao registrar recebimento');
      throw err;
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, []);

  return {
    ordens,
    loading,
    error,
    criarOrdem,
    finalizarOrdem,
    editarOrdem,
    registrarRecebimento,
    recarregarOrdens: carregarOrdens,
    excluirOrdem,
  };
};
