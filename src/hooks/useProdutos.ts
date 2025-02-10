import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

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
  idProdutoPai?: string; // Opcional pois nem todos os produtos têm essa propriedade
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
          // Convertendo o objeto em array e mantendo a estrutura completa
          const produtosList = Object.entries(data)
            .map(([id, produto]) => {
              const produtoCompleto = {
                id,
                ...(produto as Omit<Produto, 'id'>),
              };
              console.log('Produto:', produtoCompleto.nome, 'idProdutoPai:', produtoCompleto.idProdutoPai);
              return produtoCompleto;
            })
            .filter(produto => {
              // Filtra apenas produtos que definitivamente NÃO têm idProdutoPai definido
              // e que não contenham 'COR:' ou 'TAMANHO:' no nome
              const temPai = produto.hasOwnProperty('idProdutoPai') && produto.idProdutoPai !== '';
              const ehVariacao = produto.nome.includes('COR:') || produto.nome.includes('TAMANHO:');
              console.log('Filtro:', produto.nome, 'idProdutoPai:', produto.idProdutoPai, 'temPai:', temPai, 'ehVariacao:', ehVariacao);
              return !temPai && !ehVariacao; // Retorna true apenas se NÃO tiver pai e NÃO for variação
            });
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

  return { produtos, loading, error };
};
