import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useSorting } from './useSorting';

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  descricaoCurta: string;
  formato: string;
  imagemURL: string;
  preco: number;
  precoCusto: number;
  situacao: string;
  tipo: string;
  idProdutoPai?: string;
}

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const produtosRef = ref(database, 'produtos');
    
    const unsubscribe = onValue(produtosRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          // Convertendo o objeto em array mantendo todos os produtos
          const produtosList = Object.entries(data).map(([id, produto]) => ({
            id,
            ...(produto as Omit<Produto, 'id'>)
          }));
          setProdutos(produtosList);
        } else {
          setProdutos([]);
        }
        setError(null);
      } catch (err) {
        setError('Erro ao carregar produtos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setError('Erro ao carregar produtos');
      setLoading(false);
      console.error(error);
    });

    return () => unsubscribe();
  }, []);

  // Aplica a ordenação nos produtos
  const sorting = useSorting(produtos, { key: 'nome' });
  const produtosOrdenados = sorting.getSortedItems;

  return { produtos: produtosOrdenados, loading, error };
};
