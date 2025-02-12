import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

interface Fornecedor {
  id: string;
  nome: string;
}

export const useFornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fornecedoresRef = ref(database, 'fornecedores');
    
    const unsubscribe = onValue(fornecedoresRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const fornecedoresList = Object.entries(data).map(([id, fornecedor]) => ({
            id,
            ...(fornecedor as Omit<Fornecedor, 'id'>),
          }));
          setFornecedores(fornecedoresList);
        } else {
          setFornecedores([]);
        }
        setError(null);
      } catch (err) {
        setError('Erro ao carregar fornecedores');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setError('Erro ao carregar fornecedores');
      setLoading(false);
      console.error(error);
    });

    return () => unsubscribe();
  }, []);

  return { fornecedores, loading, error };
};
