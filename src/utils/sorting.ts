type SizeType = 'letter' | 'number' | 'combination' | 'unknown';

interface SizeWeight {
  weight: number;
  original: string;
}

const splitProductAndSize = (value: string): { product: string; size: string } => {
  const parts = value.split(';TAMANHO:');
  if (parts.length === 2) {
    return {
      product: parts[0],
      size: parts[1]
    };
  }
  // Se não encontrar o padrão ;TAMANHO:, retorna o valor original
  return {
    product: value,
    size: value
  };
};

const detectSizeType = (value: string): SizeType => {
  const { size } = splitProductAndSize(value);
  
  // Verifica se é apenas número
  if (/^\d+$/.test(size)) {
    return 'number';
  }
  
  // Verifica se é combinação (ex: G1, XG2)
  if (/^[X]*[GM]\d+$/i.test(size)) {
    return 'combination';
  }
  
  // Verifica se é tamanho em letra (PP, P, M, G, GG, XG, etc)
  if (/^[X]*[PMG]+$/i.test(size)) {
    return 'letter';
  }
  
  return 'unknown';
};

const getLetterSizeWeight = (size: string): SizeWeight => {
  const { size: sizeOnly } = splitProductAndSize(size);
  const normalized = sizeOnly.toUpperCase();
  
  // Mapeamento de pesos para garantir a ordem exata
  const weightMap: { [key: string]: number } = {
    'PP': 1,
    'P': 2,
    'M': 3,
    'G': 4,
    'GG': 5,
    'XGG': 6,
    'XXGG': 7,
    'XXXGG': 8
  };

  // Primeiro tenta encontrar o tamanho exato no mapa
  const weight = weightMap[normalized];
  if (weight !== undefined) {
    return { weight, original: size };
  }

  // Se não encontrou no mapa, calcula o peso
  let calculatedWeight = 0;
  
  if (normalized.startsWith('X')) {
    const xCount = (normalized.match(/X/g) || []).length;
    if (normalized.endsWith('GG')) {
      calculatedWeight = 6 + (xCount - 1); // XGG = 6, XXGG = 7, XXXGG = 8
    } else if (normalized.includes('G')) {
      calculatedWeight = 5 + xCount; // XG = 6, XXG = 7, XXXG = 8
    }
  }

  return { weight: calculatedWeight || Infinity, original: size };
};

const getNumberSizeWeight = (size: string): SizeWeight => {
  const { size: sizeOnly } = splitProductAndSize(size);
  return {
    weight: parseInt(sizeOnly, 10),
    original: size
  };
};

const getCombinationSizeWeight = (size: string): SizeWeight => {
  const { size: sizeOnly } = splitProductAndSize(size);
  const letterPart = sizeOnly.match(/^[X]*[GM]/i)?.[0] || '';
  const numberPart = sizeOnly.match(/\d+$/)?.[0] || '0';
  
  const letterWeight = getLetterSizeWeight(letterPart).weight;
  const numberWeight = parseInt(numberPart, 10) * 0.01;
  
  return {
    weight: letterWeight + numberWeight,
    original: size
  };
};

export const getSizeWeight = (size: string): SizeWeight => {
  const type = detectSizeType(size);
  
  switch (type) {
    case 'letter':
      return getLetterSizeWeight(size);
    case 'number':
      return getNumberSizeWeight(size);
    case 'combination':
      return getCombinationSizeWeight(size);
    default:
      return { weight: Infinity, original: size };
  }
};

export const sortBySize = <T extends Record<string, any>>(
  items: T[],
  sizeKey: keyof T
): T[] => {
  // Primeiro agrupa por produto (parte antes do ;TAMANHO:)
  const groupedItems = items.reduce((groups, item) => {
    const value = String(item[sizeKey]);
    const { product } = splitProductAndSize(value);
    if (!groups[product]) {
      groups[product] = [];
    }
    groups[product].push(item);
    return groups;
  }, {} as Record<string, T[]>);

  // Ordena os grupos pelo nome do produto
  const sortedGroups = Object.entries(groupedItems).sort(([a], [b]) => a.localeCompare(b));

  // Para cada grupo, ordena os itens pelo tamanho
  const sortedItems = sortedGroups.flatMap(([_, groupItems]) => {
    return groupItems.sort((a, b) => {
      const aSize = String(a[sizeKey]);
      const bSize = String(b[sizeKey]);
      
      const aWeight = getSizeWeight(aSize);
      const bWeight = getSizeWeight(bSize);
      
      if (aWeight.weight === bWeight.weight) {
        return aSize.localeCompare(bSize);
      }
      
      return aWeight.weight - bWeight.weight;
    });
  });

  return sortedItems;
};

export const sortList = (items: string[]): string[] => {
  // Primeiro agrupa por produto (parte antes do ;TAMANHO:)
  const groupedItems = items.reduce((groups, item) => {
    const { product } = splitProductAndSize(item);
    if (!groups[product]) {
      groups[product] = [];
    }
    groups[product].push(item);
    return groups;
  }, {} as Record<string, string[]>);

  // Ordena os grupos pelo nome do produto
  const sortedGroups = Object.entries(groupedItems).sort(([a], [b]) => a.localeCompare(b));

  // Para cada grupo, ordena os itens pelo tamanho
  const sortedItems = sortedGroups.flatMap(([_, groupItems]) => {
    return groupItems.sort((a, b) => {
      const aWeight = getSizeWeight(a);
      const bWeight = getSizeWeight(b);
      
      if (aWeight.weight === bWeight.weight) {
        return a.localeCompare(b);
      }
      
      return aWeight.weight - bWeight.weight;
    });
  });

  return sortedItems;
};
