import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useState, useEffect } from 'react';

export const useConfiguracoes = () => {
  const [numeroInicial, setNumeroInicial] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarConfiguracoes = async () => {
    try {
      const configRef = ref(database, 'config/numeroSequencial');
      const snapshot = await get(configRef);
      
      if (snapshot.exists()) {
        setNumeroInicial(snapshot.val());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const salvarNumeroInicial = async (numero: number) => {
    try {
      const configRef = ref(database, 'config/numeroSequencial');
      await set(configRef, numero);
      setNumeroInicial(numero);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
      throw err;
    }
  };

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  return {
    numeroInicial,
    loading,
    error,
    salvarNumeroInicial,
  };
};
