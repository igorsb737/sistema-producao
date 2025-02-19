import { useState } from 'react';
import { OrdemProducao } from './useOrdemProducao';

type SortKey = 'item' | 'dataCriacao' | 'cliente' | 'ordem' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const useLancamentoMalhaSorting = () => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedItems = (items: OrdemProducao[]) => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';

      switch (sortConfig.key) {
        case 'ordem':
          aValue = a.informacoesGerais.numero;
          bValue = b.informacoesGerais.numero;
          break;
        case 'item':
          aValue = a.solicitacao.item.nome;
          bValue = b.solicitacao.item.nome;
          break;
        case 'dataCriacao':
          aValue = a.informacoesGerais.dataInicio;
          bValue = b.informacoesGerais.dataInicio;
          break;
        case 'cliente':
          aValue = a.informacoesGerais.cliente;
          bValue = b.informacoesGerais.cliente;
          break;
        case 'status':
          aValue = a.informacoesGerais.status;
          bValue = b.informacoesGerais.status;
          break;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  return {
    sortConfig,
    requestSort,
    getSortedItems,
  };
};
