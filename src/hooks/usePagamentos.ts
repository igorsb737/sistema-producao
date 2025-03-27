import { ref, get, set, push, runTransaction } from 'firebase/database';
import { database } from '../config/firebase';
import { useBling } from './useBling';
import { format } from 'date-fns';

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
  status: 'Pendente' | 'Enviado' | 'Pago' | 'Parcialmente Pago' | 'Devolvido' | 'Cancelado';
  total: number;
  lancamentosSelecionados: Array<{
    index: number;
    valor: number;
    quantidade: number;
    servicoId: string;
  }>;
  codigoConciliacao?: string;
  blingContaPagarId?: string; // ID da conta a pagar no Bling
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
  const { registrarContaPagar, verificarStatusContaPagar } = useBling();

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
    dataPagamento: string,
    lancamentosSelecionados: Array<{
      ordemId: string;
      pagamentoId: string;
      lancamentoIndex: number;
      valor: number;
      quantidade: number;
      servicoId: string;
    }>
  ): Promise<string> => {
    try {
      const dataAtual = new Date();
      const dataConciliacao = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');
      
      // Extrair o fornecedorId do primeiro lançamento (todos têm o mesmo fornecedor)
      let fornecedorId = '';
      if (lancamentosSelecionados.length > 0) {
        const primeiroLancamento = lancamentosSelecionados[0];
        const pagamentoRef = ref(database, `ordens/${primeiroLancamento.ordemId}/pagamentos/${primeiroLancamento.pagamentoId}`);
        const snapshot = await get(pagamentoRef);
        if (snapshot.exists()) {
          const pagamento = snapshot.val();
          fornecedorId = pagamento.lancamentos[primeiroLancamento.lancamentoIndex]?.fornecedorId || '';
        }
      }
      
      // Gerar código sequencial (C00001, C00002, etc.)
      const contadorRef = ref(database, 'contadores/conciliacoes');
      let codigoConciliacao = '';
      
      // Transação para garantir que o contador seja incrementado de forma atômica
      await runTransaction(contadorRef, (contador) => {
        // Se o contador não existir, inicializa com 1
        const proximoNumero = (contador || 0) + 1;
        // Formata o número com zeros à esquerda (C00001, C00002, etc.)
        codigoConciliacao = `C${String(proximoNumero).padStart(5, '0')}`;
        return proximoNumero;
      });
      
      // Se por algum motivo a transação falhar e o código não for gerado, usa um fallback
      if (!codigoConciliacao) {
        const timestamp = Date.now();
        codigoConciliacao = `C${timestamp}`;
      }

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
          lancamentosSelecionados: lancamentos,
          codigoConciliacao
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
      
      // Armazenar um registro da conciliação completa para consultas futuras
      const conciliacoesRef = ref(database, 'conciliacoes');
      const novaConciliacaoRef = push(conciliacoesRef);
      await set(novaConciliacaoRef, {
        codigoConciliacao,
        dataPagamento,
        dataConciliacao,
        status: 'Pendente',
        total: lancamentosSelecionados.reduce((sum, l) => sum + l.valor, 0),
        fornecedorId,
        lancamentos: lancamentosSelecionados.map(l => ({
          ordemId: l.ordemId,
          pagamentoId: l.pagamentoId,
          lancamentoIndex: l.lancamentoIndex,
          valor: l.valor,
          quantidade: l.quantidade,
          servicoId: l.servicoId
        }))
      });
      
      return codigoConciliacao;
    } catch (err) {
      console.error('Erro ao criar conciliação:', err);
      throw new Error('Erro ao criar conciliação');
    }
  };

  const atualizarStatusConciliacao = async (
    ordemId: string,
    pagamentoId: string,
    novoStatus: 'Pendente' | 'Enviado' | 'Pago' | 'Parcialmente Pago' | 'Devolvido' | 'Cancelado'
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

  const enviarConciliacaoParaBling = async (
    codigoConciliacao: string
  ): Promise<boolean> => {
    try {
      // Buscar dados da conciliação
      const conciliacoesRef = ref(database, 'conciliacoes');
      const snapshot = await get(conciliacoesRef);
      
      if (!snapshot.exists()) {
        throw new Error('Nenhuma conciliação encontrada');
      }

      // Encontrar a conciliação pelo código
      const conciliacoes = snapshot.val();
      let conciliacaoEncontrada = null;
      let conciliacaoKey = '';

      for (const [key, conciliacao] of Object.entries<any>(conciliacoes)) {
        if (conciliacao.codigoConciliacao === codigoConciliacao) {
          conciliacaoEncontrada = conciliacao;
          conciliacaoKey = key;
          break;
        }
      }

      if (!conciliacaoEncontrada) {
        throw new Error(`Conciliação ${codigoConciliacao} não encontrada`);
      }

      // Buscar nome do fornecedor diretamente da coleção 'fornecedores'
      const fornecedoresRef = ref(database, 'fornecedores');
      const fornecedoresSnapshot = await get(fornecedoresRef);
      
      if (!fornecedoresSnapshot.exists()) {
        throw new Error('Nenhum fornecedor encontrado no banco de dados');
      }

      const fornecedores = fornecedoresSnapshot.val();
      // Procurar o fornecedor pelo ID
      let fornecedorNome = '';
      for (const fornecedor of Object.values<any>(fornecedores)) {
        if (fornecedor.id === conciliacaoEncontrada.fornecedorId) {
          fornecedorNome = fornecedor.nome;
          break;
        }
      }

      if (!fornecedorNome) {
        throw new Error(`Fornecedor com ID ${conciliacaoEncontrada.fornecedorId} não encontrado`);
      }

      // Formatar data de vencimento para o formato YYYY-MM-DD
      const dataPagamentoPartes = conciliacaoEncontrada.dataPagamento.split('-');
      const dataVencimento = `${dataPagamentoPartes[2]}-${dataPagamentoPartes[1]}-${dataPagamentoPartes[0]}`;

      // Formatar histórico
      const historico = `Conciliação ${codigoConciliacao}`;

      // Enviar para o Bling
      const resultado = await registrarContaPagar(
        fornecedorNome,
        conciliacaoEncontrada.total,
        dataVencimento,
        codigoConciliacao,
        historico
      );

      // Verificar se o ID da conta a pagar foi retornado
      if (resultado.success && resultado.id) {
        // Atualizar status da conciliação para 'Enviado' e salvar o ID da conta a pagar
        const conciliacaoRef = ref(database, `conciliacoes/${conciliacaoKey}`);
        await set(conciliacaoRef, {
          ...conciliacaoEncontrada,
          status: 'Enviado',
          blingContaPagarId: resultado.id
        });

        // Atualizar status em todos os pagamentos relacionados e salvar o ID da conta a pagar
        for (const lancamento of conciliacaoEncontrada.lancamentos) {
          const pagamentoRef = ref(
            database,
            `ordens/${lancamento.ordemId}/pagamentos/${lancamento.pagamentoId}`
          );
          
          const pagamentoSnapshot = await get(pagamentoRef);
          if (pagamentoSnapshot.exists()) {
            const pagamento = pagamentoSnapshot.val() as Pagamento;
            if (pagamento.conciliacao) {
              await set(pagamentoRef, {
                ...pagamento,
                conciliacao: {
                  ...pagamento.conciliacao,
                  status: 'Enviado',
                  blingContaPagarId: resultado.id
                }
              });
            }
          }
        }
      } else {
        // Se não recebeu o ID, apenas atualiza o status
        const conciliacaoRef = ref(database, `conciliacoes/${conciliacaoKey}`);
        await set(conciliacaoRef, {
          ...conciliacaoEncontrada,
          status: 'Enviado'
        });

        // Atualizar status em todos os pagamentos relacionados
        for (const lancamento of conciliacaoEncontrada.lancamentos) {
          await atualizarStatusConciliacao(
            lancamento.ordemId,
            lancamento.pagamentoId,
            'Enviado'
          );
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao enviar conciliação para o Bling:', err);
      throw new Error(`Erro ao enviar conciliação para o Bling: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
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

  // Função para atualizar o status das conciliações visíveis na tela
  const atualizarStatusConciliacoes = async (conciliacoes: Array<any>): Promise<{ atualizadas: number, total: number }> => {
    try {
      console.log('=== INÍCIO DA ATUALIZAÇÃO DE STATUS DAS CONCILIAÇÕES ===');
      console.log('Total de conciliações a verificar:', conciliacoes.length);
      
      let atualizadas = 0;
      const total = conciliacoes.length;
      
      // Primeiro, buscar todas as conciliações do Firebase para obter os IDs reais
      console.log('Buscando conciliações no Firebase...');
      const conciliacoesRef = ref(database, 'conciliacoes');
      const snapshot = await get(conciliacoesRef);
      
      if (!snapshot.exists()) {
        console.log('Nenhuma conciliação encontrada no Firebase');
        return { atualizadas: 0, total };
      }
      
      const conciliacoesFB = snapshot.val();
      console.log('Total de conciliações no Firebase:', Object.keys(conciliacoesFB).length);
      
      // Para cada conciliação na tela
      for (const conciliacao of conciliacoes) {
        console.log('\n--- Processando conciliação ---');
        console.log('Código:', conciliacao.codigoConciliacao);
        console.log('Status atual:', conciliacao.statusConciliacao);
        console.log('ID Bling:', conciliacao.blingContaPagarId);
        
        // Verifica conciliações que tenham ID do Bling (independente do status)
        if (conciliacao.blingContaPagarId) {
          console.log('Conciliação elegível para atualização');
          
          try {
            // Encontrar o ID real da conciliação no Firebase
            console.log('Buscando ID real no Firebase...');
            let fbId = '';
            for (const [id, conciliacaoFB] of Object.entries<any>(conciliacoesFB)) {
              if (conciliacaoFB.codigoConciliacao === conciliacao.codigoConciliacao) {
                fbId = id;
                console.log('ID encontrado no Firebase:', fbId);
                console.log('Dados da conciliação no Firebase:', conciliacaoFB);
                break;
              }
            }
            
            if (!fbId) {
              console.log(`Conciliação ${conciliacao.codigoConciliacao} não encontrada no Firebase`);
              continue;
            }
            
            // Verifica o status no Bling
            console.log('Verificando status no Bling...');
            const statusBling = await verificarStatusContaPagar(conciliacao.blingContaPagarId);
            console.log('Status retornado pelo Bling:', statusBling);
            
            // Mapear o status numérico do Bling para o status da conciliação
            // Valores possíveis:
            // 1 - Em aberto
            // 2 - Recebido/Pago
            // 3 - Parcialmente recebido
            // 4 - Devolvido
            // 5 - Cancelado
            let novoStatus = '';
            
            switch (statusBling) {
              case 1:
                novoStatus = 'Pendente';
                break;
              case 2:
                novoStatus = 'Pago';
                break;
              case 3:
                novoStatus = 'Parcialmente Pago';
                break;
              case 4:
                novoStatus = 'Devolvido';
                break;
              case 5:
                novoStatus = 'Cancelado';
                break;
              default:
                novoStatus = 'Enviado'; // Status padrão se não for reconhecido
            }
            
            console.log(`Mapeando status Bling ${statusBling} para status da conciliação: ${novoStatus}`);
            
            // Obter a conciliação atual do Firebase
            const conciliacaoFB = conciliacoesFB[fbId];
            
            // Atualiza na coleção de conciliações usando o ID real do Firebase
            console.log('Atualizando status no Firebase...');
            const conciliacaoRef = ref(database, `conciliacoes/${fbId}`);
            
            // Log dos dados antes da atualização
            console.log('Dados antes da atualização:', {
              ...conciliacaoFB,
              status: novoStatus
            });
            
            await set(conciliacaoRef, {
              ...conciliacaoFB,
              status: novoStatus
            });
            console.log(`Status atualizado com sucesso na conciliação para: ${novoStatus}`);
            
            // Atualiza nos pagamentos relacionados
            if (conciliacaoFB.lancamentos && Array.isArray(conciliacaoFB.lancamentos)) {
              console.log('Atualizando status nos pagamentos relacionados...');
              console.log('Total de lançamentos:', conciliacaoFB.lancamentos.length);
              
              for (const lancamento of conciliacaoFB.lancamentos) {
                console.log('Atualizando lançamento:', lancamento);
                await atualizarStatusConciliacao(
                  lancamento.ordemId,
                  lancamento.pagamentoId,
                  novoStatus
                );
              }
              console.log('Todos os lançamentos atualizados com sucesso');
            } else {
              console.log('Nenhum lançamento encontrado ou não é um array');
            }
            
            atualizadas++;
            console.log('Conciliação atualizada com sucesso');
          } catch (err) {
            console.error(`Erro ao verificar conciliação ${conciliacao.codigoConciliacao}:`, err);
            // Continua para a próxima conciliação mesmo se houver erro
          }
        } else {
          console.log('Conciliação não elegível para atualização (sem ID Bling)');
        }
      }
      
      console.log(`\n=== FIM DA ATUALIZAÇÃO: ${atualizadas} de ${total} conciliações atualizadas ===`);
      return { atualizadas, total };
    } catch (err) {
      console.error('Erro ao atualizar status das conciliações:', err);
      throw new Error(`Erro ao atualizar status das conciliações: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  return {
    buscarPagamentos,
    adicionarPagamento,
    calcularTotalPago,
    buscarPagamentosPorFornecedor,
    criarConciliacao,
    atualizarStatusConciliacao,
    buscarTotaisConciliados,
    enviarConciliacaoParaBling,
    atualizarStatusConciliacoes,
  };
};
