import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useState } from 'react';

interface ProdutoBling {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  situacao: string;
}

interface FornecedorBling {
  id: string;
  nome: string;
  codigo: string;
  situacao: string;
}

// Interface para entrada de estoque no Bling
interface EntradaEstoqueBling {
  produto: {
    id: string;
  };
  deposito: {
    id: number;
  };
  operacao: string;
  quantidade: number;
  observacoes: string;
}

// Interface para conta a pagar no Bling -
interface ContaPagarBling {
  vencimento: string;
  valor: number;
  contato: {
    id: string;
  };
  dataEmissao: string;
  categoria: {
    id: number;
  };
  numeroDocumento: string;
  competencia: string;
  historico: string;
}

export const useBling = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMalha, setLoadingMalha] = useState(false);
  const [loadingRibana, setLoadingRibana] = useState(false);
  const [loadingServico, setLoadingServico] = useState(false);
  const [loadingFornecedor, setLoadingFornecedor] = useState(false);
  const [loadingContaPagar, setLoadingContaPagar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atualizarToken = async (): Promise<string> => {
    try {
      // Tenta fazer a requisição diretamente para o endpoint completo
      // em vez de depender do proxy em produção
      const isProduction = window.location.hostname !== 'localhost';
      const webhookUrl = isProduction 
        ? 'https://n8n.apoioservidoria.top/webhook/05e988fe-20b1-4d45-872a-b88d3c1b5c8a'
        : '/webhook/05e988fe-20b1-4d45-872a-b88d3c1b5c8a';
        
      console.log('Atualizando token usando URL:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao atualizar token: Status ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('Resposta vazia do webhook');
      }
      
      // Busca o token atualizado
      const apiRef = ref(database, 'api/api');
      const snapshot = await get(apiRef);
      if (!snapshot.exists()) {
        throw new Error('Token não encontrado no Firebase');
      }
      return snapshot.val();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar token';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const fetchProdutos = async (token: string, pagina: number = 1, idCategoria: string = '10316508', criterio: string = '2'): Promise<ProdutoBling[]> => {
    try {
      const url = new URL('/api/bling/produtos', window.location.origin);
      url.searchParams.append('pagina', pagina.toString());
      url.searchParams.append('criterio', criterio);
      url.searchParams.append('idCategoria', idCategoria);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (err) {
      console.error('Erro detalhado:', err);
      if (err instanceof Error) {
        throw new Error(`Erro ao buscar produtos do Bling: ${err.message}`);
      }
      throw new Error('Erro ao buscar produtos do Bling');
    }
  };

  const sincronizarProdutos = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      let todosOsProdutos: ProdutoBling[] = [];
      let pagina = 1;
      let temMaisPaginas = true;

      while (temMaisPaginas) {
        const produtos = await fetchProdutos(token, pagina);
        if (produtos.length === 0) {
          temMaisPaginas = false;
        } else {
          todosOsProdutos = [...todosOsProdutos, ...produtos];
          pagina++;
        }
      }

      // Salvar no Firebase
      const produtosRef = ref(database, 'produtos');
      await set(produtosRef, todosOsProdutos);

      return todosOsProdutos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar produtos';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getProdutos = async (): Promise<ProdutoBling[]> => {
    try {
      const produtosRef = ref(database, 'produtos');
      const snapshot = await get(produtosRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar produtos';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const fetchMalhas = async (token: string, pagina: number = 1): Promise<ProdutoBling[]> => {
    return fetchProdutos(token, pagina, '10316610', '1');
  };

  const fetchRibanas = async (token: string, pagina: number = 1): Promise<ProdutoBling[]> => {
    return fetchProdutos(token, pagina, '10319873', '1');
  };

  const fetchServicos = async (token: string, pagina: number = 1): Promise<ProdutoBling[]> => {
    return fetchProdutos(token, pagina, '10316612', '5');
  };

  const sincronizarMalhas = async (token: string) => {
    setLoadingMalha(true);
    setError(null);
    try {
      let todasMalhas: ProdutoBling[] = [];
      let pagina = 1;
      let temMaisPaginas = true;

      while (temMaisPaginas) {
        const malhas = await fetchMalhas(token, pagina);
        if (malhas.length === 0) {
          temMaisPaginas = false;
        } else {
          todasMalhas = [...todasMalhas, ...malhas];
          pagina++;
        }
      }

      const malhasRef = ref(database, 'malhas');
      await set(malhasRef, todasMalhas);

      return todasMalhas;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar malhas';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoadingMalha(false);
    }
  };

  const sincronizarRibanas = async (token: string) => {
    setLoadingRibana(true);
    setError(null);
    try {
      let todasRibanas: ProdutoBling[] = [];
      let pagina = 1;
      let temMaisPaginas = true;

      while (temMaisPaginas) {
        const ribanas = await fetchRibanas(token, pagina);
        if (ribanas.length === 0) {
          temMaisPaginas = false;
        } else {
          todasRibanas = [...todasRibanas, ...ribanas];
          pagina++;
        }
      }

      const ribanasRef = ref(database, 'ribanas');
      await set(ribanasRef, todasRibanas);

      return todasRibanas;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar ribanas';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoadingRibana(false);
    }
  };

  const sincronizarServicos = async (token: string) => {
    setLoadingServico(true);
    setError(null);
    try {
      let todosServicos: ProdutoBling[] = [];
      let pagina = 1;
      let temMaisPaginas = true;

      while (temMaisPaginas) {
        const servicos = await fetchServicos(token, pagina);
        if (servicos.length === 0) {
          temMaisPaginas = false;
        } else {
          todosServicos = [...todosServicos, ...servicos];
          pagina++;
        }
      }

      const servicosRef = ref(database, 'servicos');
      await set(servicosRef, todosServicos);

      return todosServicos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar serviços';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoadingServico(false);
    }
  };

  const getMalhas = async (): Promise<ProdutoBling[]> => {
    try {
      const malhasRef = ref(database, 'malhas');
      const snapshot = await get(malhasRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar malhas';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getRibanas = async (): Promise<ProdutoBling[]> => {
    try {
      const ribanasRef = ref(database, 'ribanas');
      const snapshot = await get(ribanasRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar ribanas';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getServicos = async (): Promise<ProdutoBling[]> => {
    try {
      const servicosRef = ref(database, 'servicos');
      const snapshot = await get(servicosRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar serviços';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const fetchFornecedores = async (token: string, pagina: number = 1): Promise<FornecedorBling[]> => {
    try {
      const url = new URL('/api/bling/contatos', window.location.origin);
      url.searchParams.append('pagina', pagina.toString());
      url.searchParams.append('criterio', '1');
      url.searchParams.append('idTipoContato', '14578991317');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (err) {
      console.error('Erro detalhado:', err);
      if (err instanceof Error) {
        throw new Error(`Erro ao buscar fornecedores do Bling: ${err.message}`);
      }
      throw new Error('Erro ao buscar fornecedores do Bling');
    }
  };

  const sincronizarFornecedores = async (token: string) => {
    setLoadingFornecedor(true);
    setError(null);
    try {
      let todosFornecedores: FornecedorBling[] = [];
      let pagina = 1;
      let temMaisPaginas = true;

      while (temMaisPaginas) {
        const fornecedores = await fetchFornecedores(token, pagina);
        if (fornecedores.length === 0) {
          temMaisPaginas = false;
        } else {
          todosFornecedores = [...todosFornecedores, ...fornecedores];
          pagina++;
        }
      }

      // Filtra fornecedores excluídos (situação "E")
      const fornecedoresAtivos = todosFornecedores.filter(f => f.situacao !== "E");
      
      const fornecedoresRef = ref(database, 'fornecedores');
      await set(fornecedoresRef, fornecedoresAtivos);

      return fornecedoresAtivos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar fornecedores';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoadingFornecedor(false);
    }
  };

  const getFornecedores = async (): Promise<FornecedorBling[]> => {
    try {
      const fornecedoresRef = ref(database, 'fornecedores');
      const snapshot = await get(fornecedoresRef);
      
      if (snapshot.exists()) {
        const fornecedores = snapshot.val();
        // Filtra fornecedores excluídos (situação "E") mesmo ao buscar do Firebase
        return fornecedores.filter((f: FornecedorBling) => f.situacao !== "E");
      }
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar fornecedores';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Função para buscar produto pelo nome exato
  const getProdutoByNome = async (nome: string): Promise<ProdutoBling | null> => {
    try {
      const produtosRef = ref(database, 'produtos');
      const snapshot = await get(produtosRef);
      
      if (snapshot.exists()) {
        const produtos = snapshot.val();
        // Busca produto com nome exato
        const produto = Object.values(produtos).find(
          (p: any) => p.nome.trim() === nome.trim()
        ) as ProdutoBling | undefined;
        return produto || null;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar produto por nome';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Função para buscar fornecedor pelo nome exato
  const getFornecedorByNome = async (nome: string): Promise<FornecedorBling | null> => {
    try {
      const fornecedoresRef = ref(database, 'fornecedores');
      const snapshot = await get(fornecedoresRef);
      
      if (snapshot.exists()) {
        const fornecedores = snapshot.val();
        // Busca fornecedor com nome exato
        const fornecedor = Object.values(fornecedores).find(
          (f: any) => f.nome.trim() === nome.trim()
        ) as FornecedorBling | undefined;
        return fornecedor || null;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar fornecedor por nome';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Função para registrar entrada de estoque no Bling
  const registrarEntradaEstoque = async (
    produtoNome: string, 
    quantidade: number, 
    observacoes: string,
    depositoId: number = 14887912877
  ): Promise<boolean> => {
    try {
      // Busca o token do Bling
      const token = await atualizarToken();
      
      // Busca o produto pelo nome
      const produto = await getProdutoByNome(produtoNome);
      if (!produto) {
        throw new Error(`Produto não encontrado: ${produtoNome}`);
      }

      // Prepara os dados para a API
      const dadosEntrada: EntradaEstoqueBling = {
        produto: {
          id: produto.id
        },
        deposito: {
          id: depositoId
        },
        operacao: "E", // Entrada
        quantidade,
        observacoes
      };

      // Usa o proxy configurado no vite.config.ts
      const response = await fetch('/api/bling/estoques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dadosEntrada)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar entrada de estoque';
      setError(errorMessage);
      console.error('Erro ao registrar entrada de estoque:', err);
      throw new Error(errorMessage);
    }
  };

  // Função para registrar saída de estoque no Bling
  const registrarSaidaEstoque = async (
    produtoId: string, 
    quantidade: number, 
    observacoes: string,
    depositoId: number = 14887912877
  ): Promise<boolean> => {
    try {
      // Busca o token do Bling
      const token = await atualizarToken();

      // Prepara os dados para a API
      const dadosSaida: EntradaEstoqueBling = {
        produto: {
          id: produtoId
        },
        deposito: {
          id: depositoId
        },
        operacao: "S", // Saída
        quantidade,
        observacoes
      };

      // Usa o proxy configurado no vite.config.ts
      const response = await fetch('/api/bling/estoques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dadosSaida)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar saída de estoque';
      setError(errorMessage);
      console.error('Erro ao registrar saída de estoque:', err);
      throw new Error(errorMessage);
    }
  };

  // Função para registrar conta a pagar no Bling
  const registrarContaPagar = async (
    fornecedorNome: string,
    valor: number,
    vencimento: string,
    numeroDocumento: string,
    historico: string,
    categoriaId: number = 14690272799
  ): Promise<{ success: boolean; id?: string }> => {
    setLoadingContaPagar(true);
    setError(null);
    try {
      // Busca o token do Bling
      const token = await atualizarToken();
      
      // Busca o fornecedor pelo nome
      const fornecedor = await getFornecedorByNome(fornecedorNome);
      if (!fornecedor) {
        throw new Error(`Fornecedor não encontrado: ${fornecedorNome}`);
      }

      // Formata a data de hoje para o formato YYYY-MM-DD
      const hoje = new Date();
      const dataEmissao = hoje.toISOString().split('T')[0];
      
      // Prepara os dados para a API
      const dadosContaPagar: ContaPagarBling = {
        vencimento,
        valor,
        contato: {
          id: fornecedor.id
        },
        dataEmissao,
        categoria: {
          id: categoriaId
        },
        numeroDocumento,
        competencia: dataEmissao, // Usando a data de hoje como competência
        historico
      };

      // Usa o proxy configurado no vite.config.ts
      const response = await fetch('/api/bling/contas/pagar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dadosContaPagar)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      // Processar a resposta para obter o ID da conta a pagar
      const responseData = await response.json();
      console.log('Resposta do Bling (conta a pagar):', responseData);
      
      // Extrair o ID da conta a pagar da resposta
      const contaPagarId = responseData?.data?.id;
      
      return { 
        success: true,
        id: contaPagarId
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar conta a pagar';
      setError(errorMessage);
      console.error('Erro ao registrar conta a pagar:', err);
      throw new Error(errorMessage);
    } finally {
      setLoadingContaPagar(false);
    }
  };

  // Função para verificar o status de uma conta a pagar no Bling
  const verificarStatusContaPagar = async (contaId: string): Promise<number> => {
    setLoading(true);
    setError(null);
    try {
      // Busca o token do Bling
      const token = await atualizarToken();
      
      // Log da URL e headers
      const url = `/api/bling/contas/pagar/${contaId}`;
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      console.log('=== VERIFICAÇÃO DE STATUS CONTA A PAGAR ===');
      console.log('URL:', url);
      console.log('Headers:', headers);
      console.log('ContaId:', contaId);
      
      // Consulta a API do Bling
      const response = await fetch(url, {
        headers
      });

      // Log do status da resposta
      console.log('Status da resposta:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      // Processa a resposta
      const data = await response.json();
      console.log('Resposta completa do Bling (status conta a pagar):', JSON.stringify(data, null, 2));
      
      // Log detalhado da estrutura da resposta
      if (data?.data) {
        console.log('Estrutura da resposta:');
        console.log('- data.data.situacao:', data.data.situacao);
        console.log('- data.data.vencimento:', data.data.vencimento);
        console.log('- data.data.valor:', data.data.valor);
      } else {
        console.log('Resposta não contém os dados esperados');
      }
      
      // Retorna o status numérico da conta a pagar
      // Valores possíveis:
      // 1 - Em aberto
      // 2 - Recebido/Pago
      // 3 - Parcialmente recebido
      // 4 - Devolvido
      // 5 - Cancelado
      
      // Verifica se data.data é um objeto (resposta de conta individual)
      if (data?.data && typeof data.data === 'object' && 'situacao' in data.data) {
        const situacao = data.data.situacao || 1;
        console.log('Status retornado (objeto):', situacao);
        return situacao;
      }
      
      // Verifica se data.data é um array (resposta de lista de contas)
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const situacao = data.data[0].situacao || 1;
        console.log('Status retornado (array):', situacao);
        return situacao;
      }
      
      console.log('Nenhum status encontrado, retornando padrão (1)');
      return 1; // Padrão: Em aberto
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar status da conta a pagar';
      setError(errorMessage);
      console.error('Erro ao verificar status da conta a pagar:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      console.log('=== FIM DA VERIFICAÇÃO DE STATUS ===');
    }
  };

  return {
    loading,
    loadingMalha,
    loadingRibana,
    loadingServico,
    loadingFornecedor,
    loadingContaPagar,
    error,
    sincronizarProdutos,
    sincronizarMalhas,
    sincronizarRibanas,
    sincronizarServicos,
    sincronizarFornecedores,
    getProdutos,
    getMalhas,
    getRibanas,
    getServicos,
    getFornecedores,
    atualizarToken,
    getProdutoByNome,
    getFornecedorByNome,
    registrarEntradaEstoque,
    registrarSaidaEstoque,
    registrarContaPagar,
    verificarStatusContaPagar,
  };
};
