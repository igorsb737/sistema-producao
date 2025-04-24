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
  conciliacao?: ConciliacaoPagamento; 
}

export interface ConciliacaoPagamento {
  dataPagamento: string;
  dataConciliacao: string;
  status: 'Pendente' | 'Enviado' | 'Pago' | 'Parcialmente Pago' | 'Devolvido' | 'Cancelado';
  total: number;
  codigoConciliacao?: string;
  blingContaPagarId?: string; 
  fornecedorId: string; 
}

export interface Pagamento {
  id: string;
  lancamentos: Lancamento[];
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
        return pagamentos.filter(pagamento => 
          pagamento.lancamentos.some(lancamento => !lancamento.conciliacao)
        );
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

  const calcularTotalConciliado = async (orderId: string): Promise<number> => {
    try {
      // Buscar todos os pagamentos da ordem
      const pagamentos = await buscarPagamentos(orderId);
      
      // Buscar serviços para identificar os tipos específicos
      const servicosRef = ref(database, 'servicos');
      const snapshot = await get(servicosRef);
      if (!snapshot.exists()) {
        return 0;
      }
      
      const servicos = snapshot.val();
      
      // Filtrar e somar apenas os lançamentos conciliados dos serviços específicos
      let totalConciliado = 0;
      
      for (const pagamento of pagamentos) {
        for (const lancamento of pagamento.lancamentos) {
          // Verificar se o lançamento está conciliado
          if (lancamento.conciliacao) {
            // Verificar se o serviço é um dos tipos específicos
            const servico = servicos[lancamento.servicoId];
            if (servico && (
              servico.nome === 'Serviço Somente Costura' || 
              servico.nome === 'Serviço de corte e Costura'
            )) {
              totalConciliado += lancamento.quantidade;
            }
          }
        }
      }
      
      return totalConciliado;
    } catch (err) {
      console.error('Erro ao calcular total conciliado:', err);
      return 0;
    }
  };

  const buscarTotaisConciliados = async (orderId: string): Promise<TotaisConciliados> => {
    try {
      // Buscar todos os pagamentos da ordem
      const pagamentos = await buscarPagamentos(orderId);
      
      let totalQuantidade = 0;
      let totalValor = 0;
      
      // Somar todos os lançamentos conciliados
      for (const pagamento of pagamentos) {
        for (const lancamento of pagamento.lancamentos) {
          if (lancamento.conciliacao) {
            totalQuantidade += lancamento.quantidade;
            totalValor += lancamento.total;
          }
        }
      }
      
      return { quantidade: totalQuantidade, valor: totalValor };
    } catch (err) {
      console.error('Erro ao buscar totais conciliados:', err);
      return { quantidade: 0, valor: 0 };
    }
  };

  const buscarTotaisConciliadosPorTipoServico = async (orderId: string): Promise<TotaisConciliados> => {
    try {
      console.log(`[DEBUG] Iniciando buscarTotaisConciliadosPorTipoServico para ordem ${orderId}`);
      
      // Buscar todos os pagamentos da ordem
      const pagamentosRef = ref(database, `ordens/${orderId}/pagamentos`);
      const pagamentosSnapshot = await get(pagamentosRef);
      
      if (!pagamentosSnapshot.exists()) {
        console.log(`[DEBUG] Nenhum pagamento encontrado para a ordem ${orderId}`);
        return { quantidade: 0, valor: 0 };
      }
      
      console.log(`[DEBUG] Pagamentos encontrados para a ordem ${orderId}`);
      
      // Buscar todos os serviços
      const servicosRef = ref(database, 'servicos');
      const servicosSnapshot = await get(servicosRef);
      
      if (!servicosSnapshot.exists()) {
        console.log('[DEBUG] Nenhum serviço encontrado no banco de dados');
        return { quantidade: 0, valor: 0 };
      }
      
      // Obter os serviços como um array
      const servicosData = servicosSnapshot.val();
      
      // Listar todos os serviços para debug
      console.log('[DEBUG] Lista de todos os serviços:');
      Object.entries(servicosData).forEach(([id, servico]: [string, any]) => {
        console.log(`ID: ${id}, Nome: ${servico.nome || 'N/A'}`);
      });
      
      // Nomes dos serviços alvo (em minúsculas para comparação case-insensitive)
      const servicosAlvoNomes = ['serviço somente costura', 'serviço de corte e costura'];
      
      let totalQuantidade = 0;
      let totalValor = 0;
      
      const pagamentosData = pagamentosSnapshot.val();
      
      // Para cada pagamento
      for (const [pagamentoId, pagamento] of Object.entries<any>(pagamentosData)) {
        console.log(`[DEBUG] Processando pagamento ${pagamentoId}`);
        
        if (!pagamento.lancamentos || !Array.isArray(pagamento.lancamentos)) {
          console.log(`[DEBUG] Pagamento ${pagamentoId} não tem lançamentos válidos`);
          continue;
        }
        
        console.log(`[DEBUG] Pagamento ${pagamentoId} tem ${pagamento.lancamentos.length} lançamentos`);
        
        // Para cada lançamento no pagamento
        for (let i = 0; i < pagamento.lancamentos.length; i++) {
          const lancamento = pagamento.lancamentos[i];
          
          if (!lancamento) {
            console.log(`[DEBUG] Lançamento ${i} é nulo ou indefinido`);
            continue;
          }
          
          console.log(`[DEBUG] Lançamento ${i}: servicoId=${lancamento.servicoId}, conciliacao=${!!lancamento.conciliacao}`);
          
          // Verificar se o lançamento está conciliado
          if (lancamento.conciliacao) {
            // Tentar encontrar o serviço pelo ID
            let servicoEncontrado = null;
            
            // Primeiro, tentar buscar diretamente pelo ID como chave
            if (servicosData[lancamento.servicoId]) {
              servicoEncontrado = servicosData[lancamento.servicoId];
              console.log(`[DEBUG] Serviço encontrado diretamente pela chave ${lancamento.servicoId}`);
            } else {
              // Se não encontrar, buscar em todos os serviços pelo campo id
              for (const [_, servico] of Object.entries<any>(servicosData)) {
                if (servico && servico.id && String(servico.id) === String(lancamento.servicoId)) {
                  servicoEncontrado = servico;
                  console.log(`[DEBUG] Serviço encontrado pelo campo id ${lancamento.servicoId}`);
                  break;
                }
              }
            }
            
            if (servicoEncontrado) {
              const nomeServico = servicoEncontrado.nome || '';
              console.log(`[DEBUG] Serviço encontrado: ${nomeServico}`);
              
              // Verificar se o serviço é um dos tipos específicos
              const nomeServicoLowerCase = nomeServico.toLowerCase();
              const isServicoAlvo = servicosAlvoNomes.some(nome => 
                nomeServicoLowerCase === nome || nomeServicoLowerCase.includes(nome)
              );
              
              if (isServicoAlvo) {
                console.log(`[DEBUG] Lançamento ${i} é válido para contagem: quantidade=${lancamento.quantidade || 0}, valor=${lancamento.total || 0}`);
                
                // Somar à quantidade e valor total
                totalQuantidade += Number(lancamento.quantidade || 0);
                totalValor += Number(lancamento.total || 0);
              } else {
                console.log(`[DEBUG] Serviço ${nomeServico} não é um serviço alvo`);
              }
            } else {
              // Último recurso: verificar se o servicoId contém alguma indicação de que é um serviço de corte ou costura
              const servicoIdStr = String(lancamento.servicoId).toLowerCase();
              if (servicoIdStr.includes('corte') || servicoIdStr.includes('costura')) {
                console.log(`[DEBUG] Serviço não encontrado, mas ID ${lancamento.servicoId} sugere serviço de corte/costura`);
                totalQuantidade += Number(lancamento.quantidade || 0);
                totalValor += Number(lancamento.total || 0);
              } else {
                console.log(`[DEBUG] Serviço não encontrado para ID ${lancamento.servicoId}`);
              }
            }
          }
        }
      }
      
      console.log(`[DEBUG] Resultado final: quantidade=${totalQuantidade}, valor=${totalValor}`);
      
      return {
        quantidade: totalQuantidade,
        valor: totalValor
      };
    } catch (err) {
      console.error('Erro ao buscar totais conciliados por tipo de serviço:', err);
      return { quantidade: 0, valor: 0 };
    }
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
                const lancamentosNaoConciliados = pagamento.lancamentos.filter(
                  (l: Lancamento) => l.fornecedorId === fornecedorId && !l.conciliacao
                );

                if (lancamentosNaoConciliados.length > 0) {
                  pagamentosPorFornecedor.push({
                    ordemId,
                    pagamento: {
                      id: pagamentoId,
                      lancamentos: lancamentosNaoConciliados
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
    }>,
    fornecedorIdSelecionado: string
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
      
      const fornecedorId = fornecedorIdSelecionado;
      
      const contadorRef = ref(database, 'contadores/conciliacoes');
      let codigoConciliacao = '';
      
      await runTransaction(contadorRef, (contador) => {
        const proximoNumero = (contador || 0) + 1;
        codigoConciliacao = `C${String(proximoNumero).padStart(5, '0')}`;
        return proximoNumero;
      });
      
      if (!codigoConciliacao) {
        const timestamp = Date.now();
        codigoConciliacao = `C${timestamp}`;
      }

      const conciliacaoBase: ConciliacaoPagamento = {
        dataPagamento,
        dataConciliacao,
        status: 'Pendente',
        total: lancamentosSelecionados.reduce((sum, l) => sum + l.valor, 0),
        codigoConciliacao,
        fornecedorId
      };

      // Atualizar cada lançamento individualmente com sua conciliação
      for (const lancamento of lancamentosSelecionados) {
        const pagamentoRef = ref(
          database,
          `ordens/${lancamento.ordemId}/pagamentos/${lancamento.pagamentoId}`
        );

        const snapshot = await get(pagamentoRef);
        if (snapshot.exists()) {
          const pagamentoAtual = snapshot.val();
          
          // Verificar se o lançamento existe
          if (
            Array.isArray(pagamentoAtual.lancamentos) && 
            pagamentoAtual.lancamentos.length > lancamento.lancamentoIndex
          ) {
            // Verificar se o lançamento pertence ao fornecedor correto
            const lancamentoAtual = pagamentoAtual.lancamentos[lancamento.lancamentoIndex];
            
            if (lancamentoAtual.fornecedorId === fornecedorId) {
              // Criar uma cópia dos lançamentos para modificação
              const lancamentosAtualizados = [...pagamentoAtual.lancamentos];
              
              // Atualizar o lançamento específico com a informação de conciliação
              lancamentosAtualizados[lancamento.lancamentoIndex] = {
                ...lancamentosAtualizados[lancamento.lancamentoIndex],
                conciliacao: conciliacaoBase
              };
              
              // Atualizar o pagamento com os lançamentos modificados
              await set(pagamentoRef, {
                ...pagamentoAtual,
                lancamentos: lancamentosAtualizados
              });
            } else {
              console.warn(`Lançamento não pertence ao fornecedor ${fornecedorId}: Ordem=${lancamento.ordemId}, Pagamento=${lancamento.pagamentoId}, Índice=${lancamento.lancamentoIndex}`);
              throw new Error(`Lançamento não pertence ao fornecedor ${fornecedorId}: Ordem=${lancamento.ordemId}, Pagamento=${lancamento.pagamentoId}, Índice=${lancamento.lancamentoIndex}`);
            }
          } else {
            console.warn(`Lançamento não encontrado: Ordem=${lancamento.ordemId}, Pagamento=${lancamento.pagamentoId}, Índice=${lancamento.lancamentoIndex}`);
            throw new Error(`Lançamento não encontrado: Ordem=${lancamento.ordemId}, Pagamento=${lancamento.pagamentoId}, Índice=${lancamento.lancamentoIndex}`);
          }
        } else {
          console.warn(`Pagamento não encontrado: Ordem=${lancamento.ordemId}, Pagamento=${lancamento.pagamentoId}`);
          throw new Error(`Pagamento não encontrado: Ordem=${lancamento.ordemId}, Pagamento=${lancamento.pagamentoId}`);
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
      throw err; // Propagar o erro original para melhor diagnóstico
    }
  };

  const atualizarStatusConciliacao = async (
    ordemId: string,
    pagamentoId: string,
    lancamentoIndex: number,
    novoStatus: 'Pendente' | 'Enviado' | 'Pago' | 'Parcialmente Pago' | 'Devolvido' | 'Cancelado',
    blingContaPagarId?: string
  ) => {
    try {
      const pagamentoRef = ref(
        database,
        `ordens/${ordemId}/pagamentos/${pagamentoId}`
      );
      
      const snapshot = await get(pagamentoRef);
      if (snapshot.exists()) {
        const pagamento = snapshot.val() as Pagamento;
        if (
          Array.isArray(pagamento.lancamentos) && 
          pagamento.lancamentos.length > lancamentoIndex &&
          pagamento.lancamentos[lancamentoIndex].conciliacao
        ) {
          const lancamentosAtualizados = [...pagamento.lancamentos];
          
          // Garantir que todos os campos obrigatórios sejam preservados
          const conciliacaoAtual = lancamentosAtualizados[lancamentoIndex].conciliacao!;
          
          lancamentosAtualizados[lancamentoIndex] = {
            ...lancamentosAtualizados[lancamentoIndex],
            conciliacao: {
              ...conciliacaoAtual,
              status: novoStatus,
              ...(blingContaPagarId ? { blingContaPagarId } : {})
            }
          };
          
          await set(pagamentoRef, {
            ...pagamento,
            lancamentos: lancamentosAtualizados
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
      const conciliacoesRef = ref(database, 'conciliacoes');
      const snapshot = await get(conciliacoesRef);
      
      if (!snapshot.exists()) {
        throw new Error('Nenhuma conciliação encontrada');
      }

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

      const fornecedoresRef = ref(database, 'fornecedores');
      const fornecedoresSnapshot = await get(fornecedoresRef);
      
      if (!fornecedoresSnapshot.exists()) {
        throw new Error('Nenhum fornecedor encontrado no banco de dados');
      }

      const fornecedores = fornecedoresSnapshot.val();
      
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

      const dataPagamentoPartes = conciliacaoEncontrada.dataPagamento.split('-');
      const dataVencimento = `${dataPagamentoPartes[2]}-${dataPagamentoPartes[1]}-${dataPagamentoPartes[0]}`;

      const historico = `Conciliação ${codigoConciliacao}`;
      
      const resultado = await registrarContaPagar(
        fornecedorNome,
        conciliacaoEncontrada.total,
        dataVencimento,
        codigoConciliacao,
        historico,
        14690272799, 
        conciliacaoEncontrada.fornecedorId 
      );

      if (resultado.success && resultado.id) {
        const conciliacaoRef = ref(database, `conciliacoes/${conciliacaoKey}`);
        await set(conciliacaoRef, {
          ...conciliacaoEncontrada,
          status: 'Enviado',
          blingContaPagarId: resultado.id
        });

        for (const lancamento of conciliacaoEncontrada.lancamentos) {
          await atualizarStatusConciliacao(
            lancamento.ordemId,
            lancamento.pagamentoId,
            lancamento.lancamentoIndex,
            'Enviado',
            resultado.id
          );
        }
      } else {
        const conciliacaoRef = ref(database, `conciliacoes/${conciliacaoKey}`);
        await set(conciliacaoRef, {
          ...conciliacaoEncontrada,
          status: 'Enviado'
        });

        for (const lancamento of conciliacaoEncontrada.lancamentos) {
          await atualizarStatusConciliacao(
            lancamento.ordemId,
            lancamento.pagamentoId,
            lancamento.lancamentoIndex,
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

  const atualizarStatusConciliacoes = async (conciliacoes: Array<any>): Promise<{ atualizadas: number, total: number }> => {
    try {
      let atualizadas = 0;
      const total = conciliacoes.length;
      
      const conciliacoesRef = ref(database, 'conciliacoes');
      const snapshot = await get(conciliacoesRef);
      
      if (!snapshot.exists()) {
        return { atualizadas: 0, total };
      }
      
      const conciliacoesFB = snapshot.val();
      
      for (const conciliacao of conciliacoes) {
        if (conciliacao.blingContaPagarId) {
          try {
            let fbId = '';
            for (const [id, conciliacaoFB] of Object.entries<any>(conciliacoesFB)) {
              if (conciliacaoFB.codigoConciliacao === conciliacao.codigoConciliacao) {
                fbId = id;
                break;
              }
            }
            
            if (!fbId) {
              continue;
            }
            
            const statusBling = await verificarStatusContaPagar(conciliacao.blingContaPagarId);
            
            let novoStatus: 'Pendente' | 'Enviado' | 'Pago' | 'Parcialmente Pago' | 'Devolvido' | 'Cancelado' = 'Enviado';
            
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
            }
            
            const conciliacaoFB = conciliacoesFB[fbId];
            
            const conciliacaoRef = ref(database, `conciliacoes/${fbId}`);
            
            await set(conciliacaoRef, {
              ...conciliacaoFB,
              status: novoStatus
            });
            
            if (conciliacaoFB.lancamentos && Array.isArray(conciliacaoFB.lancamentos)) {
              for (const lancamento of conciliacaoFB.lancamentos) {
                await atualizarStatusConciliacao(
                  lancamento.ordemId,
                  lancamento.pagamentoId,
                  lancamento.lancamentoIndex,
                  novoStatus
                );
              }
            }
            
            atualizadas++;
          } catch (err) {
            console.error(`Erro ao verificar conciliação ${conciliacao.codigoConciliacao}:`, err);
          }
        }
      }
      
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
    calcularTotalConciliado,
    buscarPagamentosPorFornecedor,
    criarConciliacao,
    atualizarStatusConciliacao,
    enviarConciliacaoParaBling,
    buscarTotaisConciliados,
    buscarTotaisConciliadosPorTipoServico,
    atualizarStatusConciliacoes
  };
};
