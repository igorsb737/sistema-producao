import { useState, useMemo } from 'react';
import { useMalhas } from '../../hooks/useMalhas';
import { useRibanas } from '../../hooks/useRibanas';
import { useProdutos } from '../../hooks/useProdutos';
import { useNavigate } from 'react-router-dom';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

interface Grade {
  codigo: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  entregas: number[];
}

interface ItemSelecionado {
  id: string;
  nome: string;
  codigo?: string;
  descricaoCurta?: string;
}

const NovaOrdemProducao = () => {
  const [dataInicio] = useState(dayjs());
  const [dataEntrega, setDataEntrega] = useState<dayjs.Dayjs | null>(null);
  const [cliente, setCliente] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<ItemSelecionado | null>(null);
  const [malhaSelecionada, setMalhaSelecionada] = useState<ItemSelecionado | null>(null);
  const [ribanaSelecionada, setRibanaSelecionada] = useState<ItemSelecionado | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);

  const { produtos, loading: loadingProdutos, error: errorProdutos } = useProdutos();
  const { malhas, loading: loadingMalhas, error: errorMalhas } = useMalhas();
  const { ribanas, loading: loadingRibanas, error: errorRibanas } = useRibanas();
  const tamanhos = ['P', 'M', 'G', 'GG', 'XG', 'XGG'];
  const cores = ['Preto', 'Branco', 'Azul', 'Vermelho'];

  const adicionarGrade = () => {
    if (!itemSelecionado) return;
    
    const novaGrade: Grade = {
      codigo: `${itemSelecionado.nome}-${grades.length + 1}`,
      tamanho: '',
      cor: '',
      quantidade: 0,
      entregas: [],
    };
    setGrades([...grades, novaGrade]);
  };

  const navigate = useNavigate();
  const { criarOrdem } = useOrdemProducao();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataEntrega || !cliente || !itemSelecionado || !malhaSelecionada || !ribanaSelecionada || grades.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      await criarOrdem({
        dataInicio: dataInicio.format('DD-MM-YYYY'),
        dataEntrega: dataEntrega.format('DD-MM-YYYY'),
        cliente,
        item: itemSelecionado.nome,
        malha: malhaSelecionada.nome,
        ribana: ribanaSelecionada.nome,
        grades,
        status: 'Aberta',
        totalCamisetas: grades.reduce((total, grade) => total + grade.quantidade, 0),
      });
      
      navigate('/ordens');
    } catch (error) {
      alert('Erro ao criar ordem de produção');
      console.error(error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, mt: 3 }}>
        <Typography variant="h4">Nova Ordem de Produção</Typography>
        <Button type="submit" variant="contained" color="primary">
          Salvar Ordem
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Informações Gerais
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DatePicker
              label="Data de Início"
              value={dataInicio}
              disabled
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DatePicker
              label="Data de Entrega"
              value={dataEntrega}
              onChange={setDataEntrega}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Solicitação
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={produtos}
              value={itemSelecionado}
              onChange={(_, newValue) => setItemSelecionado(newValue)}
              loading={loadingProdutos}
              getOptionLabel={(option) => option.nome}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                
                const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                
                return options.filter(option => {
                  const searchText = `${option.nome} ${option.codigo || ''} ${option.descricaoCurta || ''}`.toLowerCase();
                  return terms.every(term => searchText.includes(term));
                });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Item" 
                  fullWidth 
                  error={!!errorProdutos}
                  helperText={errorProdutos}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={malhas}
              value={malhaSelecionada}
              onChange={(_, newValue) => setMalhaSelecionada(newValue)}
              loading={loadingMalhas}
              getOptionLabel={(option) => option.nome}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                
                const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                
                return options.filter(option => {
                  const searchText = option.nome.toLowerCase();
                  return terms.every(term => searchText.includes(term));
                });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Malha" 
                  fullWidth 
                  error={!!errorMalhas}
                  helperText={errorMalhas}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={ribanas}
              value={ribanaSelecionada}
              onChange={(_, newValue) => setRibanaSelecionada(newValue)}
              loading={loadingRibanas}
              getOptionLabel={(option) => option.nome}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                
                const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                
                return options.filter(option => {
                  const searchText = option.nome.toLowerCase();
                  return terms.every(term => searchText.includes(term));
                });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Ribana" 
                  fullWidth 
                  error={!!errorRibanas}
                  helperText={errorRibanas}
                />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Grade de Produção</Typography>
          <Button
            variant="outlined"
            onClick={adicionarGrade}
            disabled={!itemSelecionado}
          >
            Adicionar Grade
          </Button>
        </Box>

        {grades.map((grade, index) => (
          <Box key={grade.codigo} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <TextField
                  label="Código"
                  value={grade.codigo}
                  disabled
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Tamanho</InputLabel>
                  <Select
                    value={grade.tamanho}
                    label="Tamanho"
                    onChange={(e) => {
                      const newGrades = [...grades];
                      newGrades[index].tamanho = e.target.value;
                      setGrades(newGrades);
                    }}
                  >
                    {tamanhos.map((tamanho) => (
                      <MenuItem key={tamanho} value={tamanho}>
                        {tamanho}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Cor</InputLabel>
                  <Select
                    value={grade.cor}
                    label="Cor"
                    onChange={(e) => {
                      const newGrades = [...grades];
                      newGrades[index].cor = e.target.value;
                      setGrades(newGrades);
                    }}
                  >
                    {cores.map((cor) => (
                      <MenuItem key={cor} value={cor}>
                        {cor}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Quantidade"
                  type="number"
                  value={grade.quantidade}
                  onChange={(e) => {
                    const newGrades = [...grades];
                    newGrades[index].quantidade = Number(e.target.value);
                    setGrades(newGrades);
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    const newGrades = grades.filter((_, i) => i !== index);
                    setGrades(newGrades);
                  }}
                >
                  Remover
                </Button>
              </Grid>
            </Grid>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default NovaOrdemProducao;
