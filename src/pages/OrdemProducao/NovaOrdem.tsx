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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

interface Grade {
  codigo: string;
  produtoId?: string;
  quantidadePrevista: number;
  entregas: number[];
}

interface ItemSelecionado {
  id: string;
  nome: string;
  codigo?: string;
  descricaoCurta?: string;
  idProdutoPai?: string;
}

const NovaOrdemProducao = () => {
  const [dataInicio] = useState(dayjs());
  const [dataEntrega, setDataEntrega] = useState<dayjs.Dayjs | null>(null);
  const [dataFechamento, setDataFechamento] = useState<dayjs.Dayjs | null>(null);
  const [cliente, setCliente] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<ItemSelecionado | null>(null);
  const [malhaSelecionada, setMalhaSelecionada] = useState<ItemSelecionado | null>(null);
  const [ribanaSelecionada, setRibanaSelecionada] = useState<ItemSelecionado | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [previsaoMalha, setPrevisaoMalha] = useState('');
  const [previsaoRibana, setPrevisaoRibana] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dialogoRemocao, setDialogoRemocao] = useState<{aberto: boolean; indice: number | null}>({
    aberto: false,
    indice: null
  });

  const totalPrevisto = useMemo(() => {
    return grades.reduce((total, grade) => total + grade.quantidadePrevista, 0);
  }, [grades]);

  const rendimentoPrevisto = useMemo(() => {
    if (!previsaoMalha || Number(previsaoMalha) === 0) return '-';
    return (totalPrevisto / Number(previsaoMalha)).toFixed(2);
  }, [totalPrevisto, previsaoMalha]);

  const { produtos, loading: loadingProdutos, error: errorProdutos } = useProdutos();
  const { malhas, loading: loadingMalhas, error: errorMalhas } = useMalhas();
  const { ribanas, loading: loadingRibanas, error: errorRibanas } = useRibanas();
  
  const adicionarGrade = () => {
    if (!itemSelecionado) return;
    
    const novaGrade: Grade = {
      codigo: '',
      produtoId: '',
      quantidadePrevista: 0,
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
        dataFechamento: dataFechamento ? dataFechamento.format('DD-MM-YYYY') : undefined,
        cliente,
        item: itemSelecionado.nome,
        malha: malhaSelecionada.nome,
        ribana: ribanaSelecionada.nome,
        previsaoMalha,
        previsaoRibana,
        grades,
        status: 'Aberta',
        totalCamisetas: grades.reduce((total, grade) => total + grade.quantidadePrevista, 0),
        observacao,
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
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DatePicker
              label="Data de Entrega"
              value={dataEntrega}
              onChange={setDataEntrega}
              slotProps={{ 
                textField: { 
                  fullWidth: true,
                  size: "small",
                  InputLabelProps: {
                    shrink: true
                  }
                } 
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DatePicker
              label="Data de Fechamento"
              value={dataFechamento}
              onChange={setDataFechamento}
              slotProps={{ 
                textField: { 
                  fullWidth: true,
                  size: "small",
                  InputLabelProps: {
                    shrink: true
                  }
                } 
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Status"
              value="Em Aberto"
              disabled
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Rendimento Previsto"
              value={rendimentoPrevisto}
              disabled
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Peças Total Prevista"
              value={totalPrevisto || '-'}
              disabled
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Solicitação
        </Typography>
        <Grid container spacing={3}>
          <Grid item container xs={12} spacing={2}>
            <Grid item xs={9}>
              <Autocomplete
              options={produtos}
              value={itemSelecionado}
              onChange={(_, newValue) => {
                console.log('Novo item selecionado:', newValue);
                setItemSelecionado(newValue);
                // Limpa as grades quando muda o item principal
                setGrades([]);
              }}
              loading={loadingProdutos}
              getOptionLabel={(option) => option.nome}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => {
                // Filtra produtos que são pais (sem idProdutoPai) e não têm TAMANHO no nome
                const produtosFiltrados = options.filter(option => 
                  !option.idProdutoPai && !option.nome.includes('TAMANHO:')
                );
                
                if (!inputValue) return produtosFiltrados;
                
                const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                return produtosFiltrados.filter(option => {
                  const searchText = `${option.nome} ${option.codigo || ''} ${option.descricaoCurta || ''}`.toLowerCase();
                  return terms.every(term => searchText.includes(term));
                });
              }}
              renderInput={(params: any) => (
                <TextField 
                  {...params} 
                  label="Item" 
                  fullWidth 
                  size="small"
                  error={!!errorProdutos}
                      helperText={errorProdutos || "Somente itens relacionados ao item principal podem ser selecionados"}
                  InputLabelProps={{
                    shrink: true
                  }}
                />
              )}
            />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Id do Item"
                value={itemSelecionado?.id || '-'}
                disabled
                fullWidth
                size="small"
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>
          </Grid>
          <Grid item container xs={12} spacing={2}>
            <Grid item xs={9}>
              <Autocomplete
                options={malhas}
                value={malhaSelecionada}
                onChange={(_, newValue) => setMalhaSelecionada(newValue)}
                loading={loadingMalhas}
                getOptionLabel={(option) => option.nome}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, { inputValue }) => {
                  // Filtra apenas itens que contenham a palavra "cor"
                  const malhasComCor = options.filter(option => 
                    option.nome.toLowerCase().includes('cor')
                  );
                  
                  if (!inputValue) return malhasComCor;
                  
                  const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                  return malhasComCor.filter(option => {
                    const searchText = option.nome.toLowerCase();
                    return terms.every(term => searchText.includes(term));
                  });
                }}
                renderInput={(params: any) => (
                  <TextField 
                    {...params} 
                    label="Malha" 
                    fullWidth 
                    size="small"
                    error={!!errorMalhas}
                    helperText={errorMalhas}
                    InputLabelProps={{
                      shrink: true
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Previsão de Consumo de Malha"
                value={previsaoMalha}
                onChange={(e) => setPrevisaoMalha(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>
          </Grid>
          <Grid item container xs={12} spacing={2}>
            <Grid item xs={9}>
              <Autocomplete
                options={ribanas}
                value={ribanaSelecionada}
                onChange={(_, newValue) => setRibanaSelecionada(newValue)}
                loading={loadingRibanas}
                getOptionLabel={(option) => option.nome}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, { inputValue }) => {
                  // Filtra apenas itens que contenham a palavra "cor"
                  const ribanasComCor = options.filter(option => 
                    option.nome.toLowerCase().includes('cor')
                  );
                  
                  if (!inputValue) return ribanasComCor;
                  
                  const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                  return ribanasComCor.filter(option => {
                    const searchText = option.nome.toLowerCase();
                    return terms.every(term => searchText.includes(term));
                  });
                }}
                renderInput={(params: any) => (
                  <TextField 
                    {...params} 
                    label="Ribana" 
                    fullWidth 
                    size="small"
                    error={!!errorRibanas}
                    helperText={errorRibanas}
                    InputLabelProps={{
                      shrink: true
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Previsão de Consumo de Ribana"
                value={previsaoRibana}
                onChange={(e) => setPrevisaoRibana(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Grade de Produção</Typography>
          <Button
            variant="outlined"
            onClick={adicionarGrade}
            disabled={!itemSelecionado}
            size="small"
          >
            Adicionar Grade
          </Button>
        </Box>

        {grades.map((grade, index) => (
          <Box key={grade.codigo || index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                <Autocomplete
                  options={produtos}
                  value={produtos.find(p => {
                    console.log('Procurando produto:', { codigo: grade.codigo, id: grade.produtoId }, 'entre:', { codigo: p.codigo, id: p.id });
                    return (grade.produtoId && p.id === grade.produtoId) || (grade.codigo && p.codigo === grade.codigo);
                  }) || null}
                  onChange={(_, newValue) => {
                    console.log('Novo valor selecionado na grade:', newValue);
                    const newGrades = [...grades];
                    if (newValue) {
                      newGrades[index] = {
                        ...newGrades[index],
                        codigo: newValue.codigo || '',
                        produtoId: newValue.id
                      };
                    } else {
                      newGrades[index] = {
                        ...newGrades[index],
                        codigo: '',
                        produtoId: ''
                      };
                    }
                    console.log('Grades atualizadas:', newGrades);
                    setGrades(newGrades);
                  }}
                  loading={loadingProdutos}
                  getOptionLabel={(option) => option.nome}
                  isOptionEqualToValue={(option, value) => {
                    console.log('Comparando opção:', option, 'com valor:', value);
                    if (!option || !value) return false;
                    return option.codigo === value.codigo || option.id === value.id;
                  }}
                  filterOptions={(options, { inputValue }) => {
                    // Primeiro filtra por idProdutoPai
                    console.log('Item Selecionado na Grade:', itemSelecionado);
                    console.log('Todas as opções:', options);
                    
                    const filteredByParent = options.filter(option => {
                      console.log('Verificando opção:', option.nome, 'idProdutoPai:', option.idProdutoPai);
                      return option.idProdutoPai === itemSelecionado?.id;
                    });
                    
                    console.log('Opções filtradas por pai:', filteredByParent);
                    
                    // Se não houver texto de busca, retorna todos os itens filtrados pelo pai
                    if (!inputValue) return filteredByParent;
                    
                    // Se houver texto de busca, filtra também pelo texto
                    const searchTerms = inputValue.toLowerCase().split('&').map(term => term.trim());
                    const finalFiltered = filteredByParent.filter(option => {
                      const searchText = `${option.nome} ${option.codigo || ''} ${option.descricaoCurta || ''}`.toLowerCase();
                      return searchTerms.every(term => searchText.includes(term));
                    });
                    
                    console.log('Opções finais após busca:', finalFiltered);
                    return finalFiltered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Item Grade"
                      fullWidth
                      size="small"
                      error={!!errorProdutos}
                      helperText={errorProdutos}
                      InputLabelProps={{
                        shrink: true
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Quantidade Prevista"
                  type="number"
                  value={grade.quantidadePrevista}
                  onChange={(e) => {
                    const newGrades = [...grades];
                    newGrades[index].quantidadePrevista = Number(e.target.value);
                    setGrades(newGrades);
                  }}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={adicionarGrade}
                  disabled={!itemSelecionado}
                  size="small"
                >
                  Adicionar Grade
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDialogoRemocao({ aberto: true, indice: index })}
                  size="small"
                  tabIndex={-1}
                >
                  Remover
                </Button>
              </Grid>
            </Grid>
          </Box>
        ))}
      </Paper>

      <Dialog
        open={dialogoRemocao.aberto}
        onClose={() => setDialogoRemocao({ aberto: false, indice: null })}
      >
        <DialogTitle>Confirmar Remoção</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover este item da grade?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogoRemocao({ aberto: false, indice: null })}
            color="primary"
          >
            Não
          </Button>
          <Button
            onClick={() => {
              if (dialogoRemocao.indice !== null) {
                const newGrades = grades.filter((_, i) => i !== dialogoRemocao.indice);
                setGrades(newGrades);
              }
              setDialogoRemocao({ aberto: false, indice: null });
            }}
            color="error"
            variant="contained"
          >
            Sim
          </Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Observações
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Observação"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              fullWidth
              multiline
              rows={4}
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default NovaOrdemProducao;
