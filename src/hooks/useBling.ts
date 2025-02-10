import { ref, set, get, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useState, useEffect } from 'react';

interface ProdutoBling {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  situacao: string;
  // Adicionar outros campos conforme necessário
}

export const useBling = () => {
  const [loading, setLoading] = useState(false);
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

  const fetchProdutos = async (token: string, pagina: number = 1): Promise<ProdutoBling[]> => {
    try {
      const url = new URL('/api/bling/produtos', window.location.origin);
      url.searchParams.append('pagina', pagina.toString());
      url.searchParams.append('criterio', '2');
      url.searchParams.append('idCategoria', '10316508');

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

  return {
    loading,
    error,
    sincronizarProdutos,
    getProdutos,
    atualizarToken,
  };
};
