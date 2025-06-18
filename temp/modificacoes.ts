// Modificações para DashboardEficiencia.tsx

// 1. Alteração do tipo do estado rendimentoPorItem
const [rendimentoPorItem, setRendimentoPorItem] = useState<Record<string, {rendimento: number, camisetas: number, malha: number}>>({});

// 2. Atualização do cálculo de rendimentoPorItem
// Calcular rendimento por item
const rendimentosPorItemArray: Record<string, {rendimento: number, camisetas: number, malha: number}> = {};
Object.entries(rendimentosPorItemMap).forEach(([item, dados]) => {
  rendimentosPorItemArray[item] = {
    rendimento: dados.malha > 0 ? dados.camisetas / dados.malha : 0,
    camisetas: dados.camisetas,
    malha: dados.malha
  };
});

setRendimentoPorItem(rendimentosPorItemArray);

// 3. Atualização do gráfico de barras
data={Object.entries(rendimentoPorItem).map(([item, {rendimento, camisetas, malha}]) => ({ item, rendimento, camisetas, malha }))}

// 4. Atualização da renderização do card Rendimento por Item
{Object.entries(rendimentoPorItem)
  .sort(([, a], [, b]) => b.rendimento - a.rendimento)
  .map(([item, {rendimento, camisetas, malha}]) => (
    <Box key={item} sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {item} - {camisetas}pçs - {malha.toFixed(2)}kg
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1, mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={100} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              backgroundColor: '#f0f0f0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#e57373'
              }
            }} 
          />
        </Box>
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
          {rendimento.toFixed(2)} camisetas/kg
        </Typography>
      </Box>
    </Box>
  ))}
