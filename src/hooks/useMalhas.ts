import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

interface Malha {
  id: string;
  nome: string;
}

export const useMalhas = () => {
  const [malhas, setMalhas] = useState<Malha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const malhasRef = ref(database, 'malhas');
    
    const unsubscribe = onValue(malhasRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const malhasList = Object.entries(data).map(([id, malha]) => ({
            id,
            ...(malha as Omit<Malha, 'id'>),
          }));
          setMalhas(malhasList);
        } else {
          setMalhas([]);
        }
        setError(null);
      } catch (err) {
        setError('Erro ao carregar malhas');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setError('Erro ao carregar malhas');
      setLoading(false);
      console.error(error);
    });

    return () => unsubscribe();
  }, []);

  return { malhas, loading, error };
};
