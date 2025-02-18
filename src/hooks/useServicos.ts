import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  situacao: 'A' | 'I';
}

export const useServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarServicos = async () => {
      try {
        const servicosRef = ref(database, 'servicos');
        const snapshot = await get(servicosRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const servicosArray = Object.entries(data).map(([id, servico]) => ({
            id,
            ...(servico as Omit<Servico, 'id'>),
          }));
          
          setServicos(servicosArray);
        } else {
          setServicos([]);
        }
      } catch (err) {
        console.error('Erro ao carregar serviços:', err);
        setError('Erro ao carregar serviços');
      } finally {
        setLoading(false);
      }
    };

    carregarServicos();
  }, []);

  const getServicoById = (id: string) => {
    return servicos.find(servico => servico.id === id);
  };

  return {
    servicos,
    loading,
    error,
    getServicoById,
  };
};
