import { ref, set, get, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useState, useEffect } from 'react';

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

export const useBling = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMalha, setLoadingMalha] = useState(false);
  const [loadingRibana, setLoadingRibana] = useState(false);
  const [loadingServico, setLoadingServico] = useState(false);
  const [loadingFornecedor, setLoadingFornecedor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atualizarToken = async (): Promise<string> => {
    try {
      const response = await fetch('/webhook/05e988fe-20b1-4d45-872a-b88d3c1b5c8a', {
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

  return {
    loading,
    loadingMalha,
    loadingRibana,
    loadingServico,
    loadingFornecedor,
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
  };
};
