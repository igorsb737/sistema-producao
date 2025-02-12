import { useMemo } from 'react';
import { sortBySize } from '../utils/sorting';

interface SortingOptions {
  key?: string;  // A chave do objeto que contém o valor a ser ordenado
  forceSize?: boolean;  // Força a ordenação por tamanho mesmo se não detectar "TAMANHO"
}

type ValidItem = string | Record<string, any>;

export function useSorting<T extends ValidItem>(items: T[], options: SortingOptions = {}): T[] {
  return useMemo(() => {
    if (!items || items.length === 0) return items;

    // Se for um array de strings
    if (typeof items[0] === 'string') {
      // Verifica se algum item contém "TAMANHO" ou se forceSize é true
      const shouldSortBySize = options.forceSize || 
        items.some(item => item.includes('TAMANHO'));

      if (shouldSortBySize) {
        const sorted = sortBySize(
          items.map(item => ({ value: item })), 
          'value'
        );
        return sorted.map(item => (item as any).value) as T[];
      }

      // Se não precisar ordenar por tamanho, faz ordenação alfabética normal
      return [...items].sort((a, b) => (a as string).localeCompare(b as string));
    }

    // Se for um array de objetos
    if (typeof items[0] === 'object' && items[0] !== null) {
      const key = options.key || Object.keys(items[0])[0];
      
      // Verifica se algum item contém "TAMANHO" no valor da chave especificada
      const shouldSortBySize = options.forceSize ||
        items.some(item => {
          const value = (item as Record<string, any>)[key];
          return typeof value === 'string' && value.includes('TAMANHO');
        });

      if (shouldSortBySize) {
        // Preserva o tipo original após a ordenação
        return sortBySize(items as Record<string, any>[], key) as T[];
      }

      // Se não precisar ordenar por tamanho, faz ordenação alfabética normal pela chave
      return [...items].sort((a, b) => {
        const aValue = String((a as Record<string, any>)[key]);
        const bValue = String((b as Record<string, any>)[key]);
        return aValue.localeCompare(bValue);
      });
    }

    // Se não for string nem objeto, retorna o array original
    return items;
  }, [items, options.key, options.forceSize]);
}
