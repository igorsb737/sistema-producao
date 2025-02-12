import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

interface Ribana {
  id: string;
  nome: string;
}

export const useRibanas = () => {
  const [ribanas, setRibanas] = useState<Ribana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ribanasRef = ref(database, 'ribanas');
    
    const unsubscribe = onValue(ribanasRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const ribanasList = Object.entries(data)
            .map(([id, ribana]) => ({
              id,
              nome: (ribana as Omit<Ribana, 'id'>).nome,
            }))
            .filter(ribana => ribana.nome.toLowerCase().includes('cor'));
          setRibanas(ribanasList);
        } else {
          setRibanas([]);
        }
        setError(null);
      } catch (err) {
        setError('Erro ao carregar ribanas');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setError('Erro ao carregar ribanas');
      setLoading(false);
      console.error(error);
    });

    return () => unsubscribe();
  }, []);

  return { ribanas, loading, error };
};
