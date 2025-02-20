import { useState, useMemo } from 'react';
import { SortConfig, SortDirection } from '../components/TableSortableHeader';
import { sortBySize } from '../utils/sorting';

interface SortOptions<T> {
  key?: keyof T;
  forceSize?: boolean;
  customSort?: (a: T, b: T, key: keyof T) => number;
  initialSort?: SortConfig[];
}

const compareValues = (a: any, b: any): number => {
  if (a === b) return 0;
  
  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  
  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  
  // Convert to strings for comparison
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();
  
  return strA.localeCompare(strB);
};

export function useSorting<T extends Record<string, any>>(items: T[], options: SortOptions<T> = {}) {
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>(options.initialSort || []);

  const requestSort = (key: string, multiSort: boolean = false) => {
    setSortConfigs(prevConfigs => {
      const currentConfig = prevConfigs.find(config => config.key === key);
      let newDirection: SortDirection = 'asc';

      if (currentConfig) {
        if (currentConfig.direction === 'asc') {
          newDirection = 'desc';
        } else {
          newDirection = null;
        }
      }

      // Se não é multiSort, limpa todas as configurações anteriores
      let newConfigs = multiSort ? [...prevConfigs] : [];

      if (newDirection === null) {
        // Remove a configuração atual
        newConfigs = newConfigs.filter(config => config.key !== key);
      } else {
        const newConfig = { key, direction: newDirection };
        const existingIndex = newConfigs.findIndex(config => config.key === key);

        if (existingIndex >= 0) {
          // Atualiza a configuração existente
          newConfigs[existingIndex] = newConfig;
        } else {
          // Adiciona nova configuração
          newConfigs.push(newConfig);
        }
      }

      return newConfigs;
    });
  };

  const getSortedItems = useMemo(() => {
    if (!items || items.length === 0 || sortConfigs.length === 0) return items;

    return [...items].sort((a, b) => {
      // Itera por todas as configurações de ordenação
      for (const config of sortConfigs) {
        const key = config.key as keyof T;
        let aValue = a[key];
        let bValue = b[key];

        // Verifica se deve usar ordenação por tamanho
        if (options.forceSize || 
            (typeof aValue === 'string' && typeof bValue === 'string' && 
             (aValue.includes('TAMANHO:') || bValue.includes('TAMANHO:')))) {
          const sortedItems = sortBySize([a, b], key);
          return sortedItems[0] === a ? -1 : 1;
        }

        // Usa customSort se fornecido
        if (options.customSort) {
          const result = options.customSort(a, b, key);
          if (result !== 0) {
            return config.direction === 'asc' ? result : -result;
          }
        } else {
          const result = compareValues(aValue, bValue);
          if (result !== 0) {
            return config.direction === 'asc' ? result : -result;
          }
        }
      }
      return 0;
    });
  }, [items, sortConfigs, options.forceSize, options.customSort]);

  return {
    sortConfigs,
    requestSort,
    getSortedItems,
  };
}
