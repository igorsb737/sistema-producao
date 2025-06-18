import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  CircularProgress, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Alert, 
  AlertTitle,
  TextField,
  Autocomplete,
  Chip,
  Divider,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  IconButton,
  Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useOrdemProducao, OrdemProducao } from '../../hooks/useOrdemProducao';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Interface para os dados do gráfico
interface DataPoint {
  data: string;
  rendimento: number;
  malha: string;
  item: string;
  [key: string]: any; // Para permitir propriedades dinâmicas
}

// Interface para os dados de rendimento por item
interface RendimentoItem {
  item: string;
  rendimento: number;
  camisetas: number;
  malha: number;
}

const DashboardEficiencia = () => {
  const { ordens, loading } = useOrdemProducao();
  const [rendimentoMedio, setRendimentoMedio] = useState<number | null>(null);
  const [rendimentoPorMalha, setRendimentoPorMalha] = useState<Record<string, {rendimento: number, camisetas: number, malha: number}>>({});
  const [rendimentoPorItem, setRendimentoPorItem] = useState<Record<string, {rendimento: number, camisetas: number, malha: number}>>({});
  const [rendimentoPorOP, setRendimentoPorOP] = useState<Record<string, {rendimento: number, item: string, camisetas: number, malha: number, grades?: any}>>({});
  const [expandidasOPs, setExpandidasOPs] = useState<Record<string, boolean>>({});
  const [relacaoMalhaCamisetas, setRelacaoMalhaCamisetas] = useState<number | null>(null);
  const [loadingDados, setLoadingDados] = useState(true);
  const [dadosGrafico, setDadosGrafico] = useState<DataPoint[]>([]);
  const [itensPorGrafico, setItensPorGrafico] = useState<string[]>([]);
  const [coresPorItem, setCoresPorItem] = useState<{[key: string]: string}>({});
  const [tiposMalha, setTiposMalha] = useState<string[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<string[]>([]);
  const [filtroMalha, setFiltroMalha] = useState<string>('todos');
  const [filtroItem, setFiltroItem] = useState<string>('');
  const [itemSelecionado, setItemSelecionado] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState<dayjs.Dayjs | null>(dayjs().subtract(30, 'day'));
  const [dataFim, setDataFim] = useState<dayjs.Dayjs | null>(dayjs());
  const [tipoData, setTipoData] = useState<'criacao' | 'lancamento'>('lancamento');
  const [tipoFiltroItem, setTipoFiltroItem] = useState<'texto' | 'lista'>('texto');

  useEffect(() => {
    if (!loading && ordens.length > 0) {
      extrairItensDisponiveis();
      extrairTiposMalha();
      calcularMetricas();
      prepararDadosGrafico();
    }
  }, [ordens, loading]);

  useEffect(() => {
    if (!loading && ordens.length > 0) {
      calcularMetricas();
      prepararDadosGrafico();
    }
  }, [filtroItem, filtroMalha, dataInicio, dataFim, tipoData, itemSelecionado, tipoFiltroItem]);

  const extrairTiposMalha = () => {
    const tipos = new Set<string>();
    
    ordens.forEach(ordem => {
      if (ordem.solicitacao?.malha?.nome) {
        tipos.add(ordem.solicitacao.malha.nome);
      }
    });
    
    setTiposMalha(Array.from(tipos));
  };

  const extrairItensDisponiveis = () => {
    const itens = new Set<string>();
    
    ordens.forEach(ordem => {
      if (ordem.solicitacao?.item?.nome) {
        itens.add(ordem.solicitacao.item.nome);
      }
    });
    
    setItensDisponiveis(Array.from(itens));
  };

  // Função para verificar se uma ordem passa pelos filtros atuais
  const passaFiltros = (ordem: OrdemProducao) => {
    // Filtro de malha
    if (filtroMalha !== 'todos' && ordem.solicitacao.malha.nome !== filtroMalha) {
      return false;
    }
    
    // Filtro de item
    if (tipoFiltroItem === 'texto' && filtroItem && filtroItem.trim() !== '') {
      const termosBusca = filtroItem.toLowerCase().split('&').map(termo => termo.trim());
      const nomeItem = ordem.solicitacao.item.nome.toLowerCase();
      
      // Verificar se todos os termos de busca estão presentes no nome do item
      const todosTermosPresentes = termosBusca.every(termo => nomeItem.includes(termo));
      if (!todosTermosPresentes) {
        return false;
      }
    } else if (tipoFiltroItem === 'lista' && itemSelecionado !== 'todos') {
      if (ordem.solicitacao.item.nome !== itemSelecionado) {
        return false;
      }
    }
    
    // Filtro de data
    if (dataInicio || dataFim) {
      let dataOrdem: string;
      
      if (tipoData === 'criacao') {
        dataOrdem = ordem.informacoesGerais.dataInicio;
      } else { // lancamento
        if (!ordem.lancamentoMalha?.dataLancamento) {
          return false; // Se não tem data de lançamento, não passa no filtro
        }
        dataOrdem = ordem.lancamentoMalha.dataLancamento;
      }
      
      // Converter formato DD-MM-YYYY para YYYY-MM-DD para comparação
      const [dia, mes, ano] = dataOrdem.split('-');
      const dataIso = `${ano}-${mes}-${dia}`;
      const dataOrdemObj = dayjs(dataIso);
      
      if (dataInicio && dataOrdemObj.isBefore(dataInicio, 'day')) {
        return false;
      }
      
      if (dataFim && dataOrdemObj.isAfter(dataFim, 'day')) {
        return false;
      }
    }
    
    return true;
  };

  const calcularMetricas = () => {
    setLoadingDados(true);
    
    try {
      // Filtrar apenas ordens finalizadas com lançamento de malha
      const ordensFinalizadas = ordens.filter(
        (ordem) => ordem.informacoesGerais.status === 'Finalizado' && 
                  ordem.lancamentoMalha && 
                  passaFiltros(ordem)
      );
      
      if (ordensFinalizadas.length === 0) {
        setRendimentoMedio(0);
        setRendimentoPorMalha({});
        setRendimentoPorItem({});
        setRendimentoPorOP({});
        setRelacaoMalhaCamisetas(0);
        setLoadingDados(false);
        return;
      }
      
      // Calcular rendimento médio (camisetas/kg de malha)
      let totalCamisetas = 0;
      let totalMalha = 0;
      
      // Agrupar por tipo de malha para cálculo de rendimento por tipo
      const rendimentosPorTipo: Record<string, { camisetas: number; malha: number }> = {};
      
      // Agrupar por item para cálculo de rendimento por item
      const rendimentosPorItemMap: Record<string, { camisetas: number; malha: number }> = {};
      
      // Agrupar por OP para cálculo de rendimento por OP
      const rendimentosPorOPMap: Record<string, { camisetas: number; malha: number; item: string; grades?: any }> = {};
      
      ordensFinalizadas.forEach((ordem) => {
        if (!ordem.lancamentoMalha) return;
        
        const camisetasOrdem = calcularTotalRecebimentos(ordem);
        const malhaUsada = ordem.lancamentoMalha.malhaUsada || 0;
        
        totalCamisetas += camisetasOrdem;
        totalMalha += malhaUsada;
        
        // Agrupar por tipo de malha
        const tipoMalha = ordem.solicitacao.malha.nome;
        if (!rendimentosPorTipo[tipoMalha]) {
          rendimentosPorTipo[tipoMalha] = { camisetas: 0, malha: 0 };
        }
        
        rendimentosPorTipo[tipoMalha].camisetas += camisetasOrdem;
        rendimentosPorTipo[tipoMalha].malha += malhaUsada;
        
        // Agrupar por item
        const nomeItem = ordem.solicitacao.item.nome;
        if (!rendimentosPorItemMap[nomeItem]) {
          rendimentosPorItemMap[nomeItem] = { camisetas: 0, malha: 0 };
        }
        
        rendimentosPorItemMap[nomeItem].camisetas += camisetasOrdem;
        rendimentosPorItemMap[nomeItem].malha += malhaUsada;
        
        // Agrupar por OP
        const numeroOP = ordem.informacoesGerais.numero;
        if (!rendimentosPorOPMap[numeroOP]) {
          rendimentosPorOPMap[numeroOP] = { camisetas: 0, malha: 0, item: nomeItem, grades: ordem.grades };
        }
        
        rendimentosPorOPMap[numeroOP].camisetas += camisetasOrdem;
        rendimentosPorOPMap[numeroOP].malha += malhaUsada;
      });
      
      // Calcular rendimento médio geral
      const rendimentoGeral = totalMalha > 0 ? totalCamisetas / totalMalha : 0;
      setRendimentoMedio(rendimentoGeral);
      
      // Calcular rendimento por tipo de malha
      const rendimentosPorMalha: Record<string, {rendimento: number, camisetas: number, malha: number}> = {};
      Object.entries(rendimentosPorTipo).forEach(([tipo, dados]) => {
        rendimentosPorMalha[tipo] = {
          rendimento: dados.malha > 0 ? dados.camisetas / dados.malha : 0,
          camisetas: dados.camisetas,
          malha: dados.malha
        };
      });
      
      setRendimentoPorMalha(rendimentosPorMalha);
      
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
      
      // Calcular rendimento por OP
      const rendimentosPorOPArray: Record<string, {rendimento: number, item: string, camisetas: number, malha: number, grades?: any}> = {};
      Object.entries(rendimentosPorOPMap).forEach(([op, dados]) => {
        rendimentosPorOPArray[op] = {
          rendimento: dados.malha > 0 ? dados.camisetas / dados.malha : 0,
          item: dados.item,
          camisetas: dados.camisetas,
          malha: dados.malha,
          grades: dados.grades
        };
      });
      
      setRendimentoPorOP(rendimentosPorOPArray);
      
      // Relação malha/camisetas (kg de malha por camiseta)
      setRelacaoMalhaCamisetas(totalCamisetas > 0 ? totalMalha / totalCamisetas : 0);
    } catch (error) {
      console.error('Erro ao calcular métricas de eficiência:', error);
    } finally {
      setLoadingDados(false);
    }
  };

  const prepararDadosGrafico = () => {
    try {
      // Filtrar apenas ordens finalizadas com lançamento de malha
      const ordensFinalizadas = ordens.filter(
        (ordem) => ordem.informacoesGerais.status === 'Finalizado' && 
                  ordem.lancamentoMalha && 
                  passaFiltros(ordem)
      );
      
      if (ordensFinalizadas.length === 0) {
        setDadosGrafico([]);
        setItensPorGrafico([]);
        return;
      }
      
      // Agrupar ordens por item e data
      const dadosPorItemEData: {[key: string]: {[key: string]: {rendimento: number, count: number}}} = {};
      const todosItens = new Set<string>();
      
      // Processar cada ordem
      ordensFinalizadas.forEach(ordem => {
        if (!ordem.lancamentoMalha) return;
        
        const camisetasOrdem = calcularTotalRecebimentos(ordem);
        const malhaUsada = ordem.lancamentoMalha.malhaUsada || 0;
        const rendimento = malhaUsada > 0 ? camisetasOrdem / malhaUsada : 0;
        
        // Usar a data conforme selecionado pelo usuário nos filtros
        let dataGrafico: string;
        if (tipoData === 'criacao') {
          dataGrafico = ordem.informacoesGerais.dataInicio;
        } else { // lancamento
          dataGrafico = ordem.lancamentoMalha.dataLancamento || ordem.informacoesGerais.dataInicio;
        }
        
        const itemNome = ordem.solicitacao.item.nome;
        todosItens.add(itemNome);
        
        // Inicializar estruturas se não existirem
        if (!dadosPorItemEData[itemNome]) {
          dadosPorItemEData[itemNome] = {};
        }
        
        if (!dadosPorItemEData[itemNome][dataGrafico]) {
          dadosPorItemEData[itemNome][dataGrafico] = { rendimento: 0, count: 0 };
        }
        
        // Acumular rendimento para calcular média depois
        dadosPorItemEData[itemNome][dataGrafico].rendimento += rendimento;
        dadosPorItemEData[itemNome][dataGrafico].count += 1;
      });
      
      // Converter para o formato esperado pelo gráfico
      const todasDatas = new Set<string>();
      Object.values(dadosPorItemEData).forEach(dataMap => {
        Object.keys(dataMap).forEach(data => todasDatas.add(data));
      });
      
      // Ordenar datas
      const datasOrdenadas = Array.from(todasDatas).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split('-');
        const [diaB, mesB, anoB] = b.split('-');
        
        const dataIsoA = `${anoA}-${mesA}-${diaA}`;
        const dataIsoB = `${anoB}-${mesB}-${diaB}`;
        
        return new Date(dataIsoA).getTime() - new Date(dataIsoB).getTime();
      });
      
      // Criar pontos de dados para cada data
      const dadosProcessados: DataPoint[] = [];
      datasOrdenadas.forEach(data => {
        const ponto: DataPoint = { data, rendimento: 0, malha: '', item: '' };
        
        // Adicionar rendimento para cada item nesta data
        todosItens.forEach(item => {
          if (dadosPorItemEData[item] && dadosPorItemEData[item][data]) {
            const { rendimento, count } = dadosPorItemEData[item][data];
            const rendimentoMedio = count > 0 ? rendimento / count : 0;
            ponto[item] = parseFloat(rendimentoMedio.toFixed(2));
          } else {
            ponto[item] = null; // Usar null para pontos sem dados
          }
        });
        
        dadosProcessados.push(ponto);
      });
      
      // Gerar cores para cada item se ainda não existirem
      const itensArray = Array.from(todosItens);
      const novasCores: {[key: string]: string} = { ...coresPorItem };
      
      itensArray.forEach((item, index) => {
        if (!novasCores[item]) {
          // Cores predefinidas para melhor consistência visual
          const cores = [
            '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', 
            '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
          ];
          novasCores[item] = cores[index % cores.length];
        }
      });
      
      setDadosGrafico(dadosProcessados);
      setItensPorGrafico(itensArray);
      setCoresPorItem(novasCores);
    } catch (error) {
      console.error('Erro ao preparar dados para o gráfico:', error);
      setDadosGrafico([]);
      setItensPorGrafico([]);
    }
  };

  const calcularTotalRecebimentos = (ordem: OrdemProducao) => {
    if (!ordem || !ordem.grades) return 0;
    return Object.values(ordem.grades).reduce((total, grade) => {
      if (!grade.recebimentos) return total;
      return total + grade.recebimentos.reduce((sum, recebimento) => sum + recebimento.quantidade, 0);
    }, 0);
  };

  const handleChangeTipoData = (
    event: React.MouseEvent<HTMLElement>,
    novoTipo: 'criacao' | 'lancamento',
  ) => {
    if (novoTipo !== null) {
      setTipoData(novoTipo);
    }
  };

  const handleChangeTipoFiltroItem = (
    event: React.MouseEvent<HTMLElement>,
    novoTipo: 'texto' | 'lista',
  ) => {
    if (novoTipo !== null) {
      setTipoFiltroItem(novoTipo);
      // Limpar os filtros anteriores ao trocar o tipo
      setFiltroItem('');
      setItemSelecionado('todos');
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Eficiência de Produção
      </Typography>
      
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box>
                <ToggleButtonGroup
                  value={tipoFiltroItem}
                  exclusive
                  onChange={handleChangeTipoFiltroItem}
                  aria-label="tipo de filtro de item"
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="texto" aria-label="filtro por texto">
                    Filtro por Texto
                  </ToggleButton>
                  <ToggleButton value="lista" aria-label="filtro por lista">
                    Selecionar Item
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <Box sx={{ flexGrow: 1 }} />
              
              {tipoFiltroItem === 'texto' ? (
                <TextField
                  fullWidth
                  label="Filtrar por Item"
                  value={filtroItem}
                  onChange={(e) => setFiltroItem(e.target.value)}
                  placeholder="Ex: Adulto & preto"
                  helperText=""
                  size="small"
                  sx={{ mt: 'auto' }}
                />
              ) : (
                <FormControl fullWidth size="small" sx={{ mt: 'auto' }}>
                  <InputLabel id="item-select-label">Selecionar Item</InputLabel>
                  <Select
                    labelId="item-select-label"
                    id="item-select"
                    value={itemSelecionado}
                    label="Selecionar Item"
                    onChange={(e) => setItemSelecionado(e.target.value as string)}
                  >
                    <MenuItem value="todos">Todos os Itens</MenuItem>
                    {itensDisponiveis.map((item) => (
                      <MenuItem key={item} value={item}>{item}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ flexGrow: 1 }} />
              <FormControl fullWidth size="small">
                <InputLabel id="filtro-malha-label">Tipo de Malha</InputLabel>
                <Select
                  labelId="filtro-malha-label"
                  id="filtro-malha"
                  value={filtroMalha}
                  label="Tipo de Malha"
                  onChange={(e) => setFiltroMalha(e.target.value as string)}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  {tiposMalha.map((tipo) => (
                    <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={tipoData}
              exclusive
              onChange={handleChangeTipoData}
              aria-label="tipo de data"
              size="small"
              fullWidth
            >
              <ToggleButton value="criacao" aria-label="data de criação">
                Data Criação
              </ToggleButton>
              <ToggleButton value="lancamento" aria-label="data de lançamento">
                Data Lançamento
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Data Início"
                    value={dataInicio}
                    onChange={(newValue) => setDataInicio(newValue)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="Data Fim"
                    value={dataFim}
                    onChange={(newValue) => setDataFim(newValue)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>
      
      {!loading && (
        <Grid container spacing={3}>
          {/* Rendimento Médio */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Rendimento Médio
                </Typography>
                
                {loadingDados ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : rendimentoMedio === null ? (
                  <Typography variant="body1" color="text.secondary" sx={{ my: 2 }}>
                    Nenhum dado disponível para os filtros selecionados
                  </Typography>
                ) : (
                  <>
                    <Typography 
                      variant="h3" 
                      color="primary" 
                      sx={{ my: 1 }}
                    >
                      {rendimentoMedio.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      camisetas/kg de malha
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Gráfico de Rendimento ao Longo do Tempo */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Variação de Rendimento ao Longo do Tempo
              </Typography>
              
              {dadosGrafico.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Nenhum dado disponível para os filtros selecionados
                </Typography>
              ) : (
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dadosGrafico}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="data" 
                        tickFormatter={(value) => value.substring(0, 5)}
                        label={{ value: `Data de ${tipoData === 'criacao' ? 'Criação' : 'Lançamento'}`, position: 'insideBottomRight', offset: -10 }}
                      />
                      <YAxis 
                        label={{ value: 'Rendimento (camisetas/kg)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip formatter={(value) => [value, 'Rendimento']} />
                      <Legend />
                      
                      {itensPorGrafico.map((item, index) => (
                        <Line 
                          key={item}
                          type="monotone" 
                          dataKey={item} 
                          name={item}
                          stroke={coresPorItem[item]}
                          activeDot={{ r: 8 }}
                          connectNulls={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Gráfico de Rendimento por Item */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Rendimento por Item
              </Typography>
              
              {loadingDados ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : Object.keys(rendimentoPorItem).length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Nenhum dado disponível para os filtros selecionados
                </Typography>
              ) : (
                <Box sx={{ height: 400, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(rendimentoPorItem).map(([item, {rendimento, camisetas, malha}]) => ({ item, rendimento, camisetas, malha }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="item" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                        interval={0}
                      />
                      <YAxis label={{ value: 'Rendimento (camisetas/kg)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => [`${value} camisetas/kg`, 'Rendimento']} />
                      <Bar dataKey="rendimento" fill="#8884d8" name="Rendimento" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Cards de métricas na parte inferior */}
          <Grid container spacing={3} sx={{ mt: 3 }}>
            {/* Card de Rendimento por Item */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Rendimento por Item
                </Typography>
                
                {loadingDados ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress />
                  </Box>
                ) : Object.keys(rendimentoPorItem).length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center', flexGrow: 1 }}>
                    Nenhum dado disponível para os filtros selecionados
                  </Typography>
                ) : (
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                  </Box>
                )}
              </Paper>
            </Grid>
            
            {/* Card de Rendimentos por OP */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Rendimentos por OP
                </Typography>
                
                {loadingDados ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress />
                  </Box>
                ) : Object.keys(rendimentoPorOP).length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center', flexGrow: 1 }}>
                    Nenhum dado disponível para os filtros selecionados
                  </Typography>
                ) : (
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {Object.entries(rendimentoPorOP)
                      .sort(([, a], [, b]) => b.rendimento - a.rendimento)
                      .map(([op, { rendimento, item, camisetas, malha, grades }]) => (
                        <Box key={op} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <IconButton
                              aria-label={expandidasOPs[op] ? 'ocultar grades' : 'mostrar grades'}
                              size="small"
                              onClick={() => setExpandidasOPs(prev => ({
                                ...prev,
                                [op]: !prev[op]
                              }))}
                              sx={{ mr: 1, p: 0.25 }}
                            >
                              {expandidasOPs[op] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                            <Typography variant="body2">
                              OP {op} - {item} - {camisetas}pçs - {malha.toFixed(2)}kg
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 28 }} /> {/* Espaço para alinhar com o botão acima */}
                            <Box sx={{ flexGrow: 1, mr: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={100} 
                                sx={{ 
                                  height: 10, 
                                  borderRadius: 5,
                                  backgroundColor: '#f0f0f0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#81c784'
                                  }
                                }} 
                              />
                            </Box>
                            <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
                              {rendimento.toFixed(2)} camisetas/kg
                            </Typography>
                          </Box>
                          
                          {/* Grades da OP - Expandível */}
                          <Collapse in={expandidasOPs[op]} timeout="auto" unmountOnExit>
                            <Box sx={{ mt: 1, ml: 4, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                                Grades
                              </Typography>
                              {grades && Object.entries(grades).length > 0 ? (
                                <Grid container spacing={1}>
                                  {Object.entries(grades).map(([gradeKey, gradeData]: [string, any]) => {
                                    const nomeGradeFormatado = gradeData.codigo || // Primeira opção: código da grade 
                                                           gradeData.nome || // Segunda opção: nome já formatado
                                                           (gradeKey.includes('COR:') ? gradeKey : null) || // Verificar se a chave tem formato
                                                           `${item} COR:${gradeData.cor || ''};TAMANHO:${gradeData.tamanho || ''}` || // Construir formato padrão
                                                           'Grade'; // Fallback
                                    
                                    return (
                                      <Grid item xs={12} sm={6} md={4} lg={3} key={gradeKey}>
                                        <Box sx={{ backgroundColor: '#f9f9f9', p: 1, borderRadius: 1 }}>
                                          <Typography variant="caption" sx={{ fontWeight: 'bold', wordBreak: 'break-word', display: 'block', mb: 0.5 }}>
                                            {nomeGradeFormatado}
                                          </Typography>
                                          <Box>
                                            <Typography variant="caption" display="block">
                                              Planejado: {gradeData.quantidade || gradeData.quantidadePrevista || 0} pçs
                                            </Typography>
                                            {gradeData.recebimentos && (
                                              <Typography variant="caption" display="block">
                                                Recebido: {gradeData.recebimentos.reduce((total: number, rec: any) => total + rec.quantidade, 0)} pçs
                                              </Typography>
                                            )}
                                          </Box>
                                        </Box>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Nenhuma informação de grade disponível
                                </Typography>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                      ))}
                  </Box>
                )}
              </Paper>
            </Grid>
            
            {/* Card de Rendimento por Tipo de Malha */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Rendimento por Tipo de Malha
                </Typography>
                
                {loadingDados ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : Object.keys(rendimentoPorMalha).length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    Nenhum dado disponível para os filtros selecionados
                  </Typography>
                ) : (
                  <Box>
                    {Object.entries(rendimentoPorMalha)
                      .sort(([, a], [, b]) => b.rendimento - a.rendimento)
                      .map(([malha, { rendimento, camisetas, malha: malhaUsada }]) => (
                        <Box key={malha} sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {malha} - {camisetas}pçs - {malhaUsada.toFixed(2)}kg
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
                                    backgroundColor: '#f44336'
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
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardEficiencia;




