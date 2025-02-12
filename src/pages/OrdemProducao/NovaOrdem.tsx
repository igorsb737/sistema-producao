import { useState, useMemo, useEffect } from 'react';
import { useMalhas } from '../../hooks/useMalhas';
import { useRibanas } from '../../hooks/useRibanas';
import { useProdutos } from '../../hooks/useProdutos';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrdemProducao, type Status } from '../../hooks/useOrdemProducao';
import { sortBySize } from '../../utils/sorting';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

interface Grade {
  codigo: string;
  produtoId: string;
  nome: string;
  quantidadePrevista: number;
  entregas: number[];
}

interface Grades {
  [key: string]: Grade;
}

interface ItemSelecionado {
  id: string;
  nome: string;
  codigo?: string;
  descricaoCurta?: string;
  idProdutoPai?: string;
}

const NovaOrdemProducao = () => {
  const { id } = useParams();
  const [dataInicio, setDataInicio] = useState<dayjs.Dayjs | null>(dayjs());
  const [dataEntrega, setDataEntrega] = useState<dayjs.Dayjs | null>(null);
  const [dataFechamento, setDataFechamento] = useState<dayjs.Dayjs | null>(null);
  const [cliente, setCliente] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<ItemSelecionado | null>(null);
  const [malhaSelecionada, setMalhaSelecionada] = useState<ItemSelecionado | null>(null);
  const [ribanaSelecionada, setRibanaSelecionada] = useState<ItemSelecionado | null>(null);
  const [grades, setGrades] = useState<Grades>({});
  const [previsaoMalha, setPrevisaoMalha] = useState('');
  const [previsaoRibana, setPrevisaoRibana] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dialogoRemocao, setDialogoRemocao] = useState<{aberto: boolean; gradeId: string | null}>({
    aberto: false,
    gradeId: null
  });

  const totalPrevisto = useMemo(() => {
    return Object.values(grades).reduce((total, grade) => total + grade.quantidadePrevista, 0);
  }, [grades]);

  const rendimentoPrevisto = useMemo(() => {
    if (!previsaoMalha || Number(previsaoMalha) === 0) return '-';
    return (totalPrevisto / Number(previsaoMalha)).toFixed(2);
  }, [totalPrevisto, previsaoMalha]);

  const { produtos, loading: loadingProdutos, error: errorProdutos } = useProdutos();
  const { malhas, loading: loadingMalhas, error: errorMalhas } = useMalhas();
  const { ribanas, loading: loadingRibanas, error: errorRibanas } = useRibanas();
  const { ordens, criarOrdem, editarOrdem } = useOrdemProducao();
  
  // Carrega os dados da ordem existente
  useEffect(() => {
    if (id) {
      const ordem = ordens.find(o => o.informacoesGerais.numero === id.padStart(4, '0'));
      if (ordem) {
        setDataInicio(dayjs(ordem.informacoesGerais.dataInicio, 'DD-MM-YYYY'));
        setDataEntrega(dayjs(ordem.informacoesGerais.dataEntrega, 'DD-MM-YYYY'));
        if (ordem.informacoesGerais.dataFechamento) {
          setDataFechamento(dayjs(ordem.informacoesGerais.dataFechamento, 'DD-MM-YYYY'));
        }
        setCliente(ordem.informacoesGerais.cliente || '');
        
        // Encontra o item nos produtos
        const item = produtos.find(p => p.nome === ordem.solicitacao.item.nome);
        if (item) {
          setItemSelecionado(item);
        }

        // Encontra a malha
        const malha = malhas.find(m => m.nome === ordem.solicitacao.malha.nome);
        if (malha) {
          setMalhaSelecionada(malha);
        }

        // Encontra a ribana
        const ribana = ribanas.find(r => r.nome === ordem.solicitacao.ribana.nome);
        if (ribana) {
          setRibanaSelecionada(ribana);
        }

        setPrevisaoMalha(ordem.solicitacao.previsoes.malha || '');
        setPrevisaoRibana(ordem.solicitacao.previsoes.ribana || '');
        setGrades(ordem.grades || {});
        setObservacao(ordem.informacoesGerais.observacao || '');
      }
    }
  }, [id, ordens, produtos, malhas, ribanas]);

  const adicionarGrade = () => {
    if (!itemSelecionado) return;
    
    const gradeId = `grade_${Date.now()}`;
    const novaGrade: Grade = {
      codigo: '',
      produtoId: '',
      nome: '',
      quantidadePrevista: 0,
      entregas: [],
    };
    
    setGrades(prevGrades => ({
      ...prevGrades,
      [gradeId]: novaGrade
    }));
  };

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent, isRascunho: boolean = false) => {
    e.preventDefault();

    // Para rascunho, permite salvar sem validações
    if (isRascunho) {
      try {
        const dataInicioFormatted = dataInicio?.format('DD-MM-YYYY') || dayjs().format('DD-MM-YYYY');
        const dataEntregaFormatted = dataEntrega ? dataEntrega.format('DD-MM-YYYY') : dataInicioFormatted;
        const totalCamisetas = Object.values(grades).reduce((total, grade) => total + grade.quantidadePrevista, 0);
        
        const ordemData = {
          informacoesGerais: {
            cliente: cliente || '',
            dataInicio: dataInicioFormatted,
            dataEntrega: dataEntregaFormatted,
            status: 'Rascunho' as Status,
            observacao: observacao || '',
            totalCamisetas
          },
          solicitacao: {
            item: {
              nome: itemSelecionado?.nome || '',
              produtoId: itemSelecionado?.id || ''
            },
            malha: {
              nome: malhaSelecionada?.nome || '',
              produtoId: malhaSelecionada?.id || ''
            },
            ribana: {
              nome: ribanaSelecionada?.nome || '',
              produtoId: ribanaSelecionada?.id || ''
            },
            previsoes: {
              malha: previsaoMalha || '',
              ribana: previsaoRibana || ''
            }
          },
          grades
        };

        if (id) {
          const ordem = ordens.find(o => o.informacoesGerais.numero === id.padStart(4, '0'));
          if (ordem) {
            await editarOrdem(ordem.id, ordemData);
          }
        } else {
          await criarOrdem(ordemData);
        }
        
        navigate('/ordens');
        return;
      } catch (error) {
        alert('Erro ao salvar rascunho');
        console.error(error);
        return;
      }
    }

    // Validações para salvar ordem
    const erros: string[] = [];

    if (!dataEntrega) {
      erros.push('Data de Entrega é obrigatória');
    }

    if (!itemSelecionado) {
      erros.push('Item é obrigatório');
    }

    if (!malhaSelecionada) {
      erros.push('Malha é obrigatória');
    }

    if (!ribanaSelecionada) {
      erros.push('Ribana é obrigatória');
    }

    if (!previsaoMalha) {
      erros.push('Previsão de Consumo de Malha é obrigatória');
    }

    if (!previsaoRibana) {
      erros.push('Previsão de Consumo de Ribana é obrigatória');
    }

    // Validação das grades
    if (Object.keys(grades).length === 0) {
      erros.push('É necessário adicionar pelo menos uma grade de produção');
    } else {
      const gradesInvalidas = Object.values(grades).some(grade => !grade.codigo || !grade.quantidadePrevista);
      if (gradesInvalidas) {
        erros.push('Todas as grades devem ter um item e quantidade prevista preenchidos');
      }
    }

    if (erros.length > 0) {
      alert('Por favor, corrija os seguintes erros:\n\n' + erros.join('\n'));
      return;
    }

    try {
      // Neste ponto, já passamos pelas validações, então podemos garantir que os valores existem
      if (!dataEntrega || !itemSelecionado || !malhaSelecionada || !ribanaSelecionada) {
        throw new Error('Valores obrigatórios não preenchidos');
      }

      const dataInicioFormatted = dataInicio?.format('DD-MM-YYYY') || dayjs().format('DD-MM-YYYY');
      const dataEntregaFormatted = dataEntrega?.format('DD-MM-YYYY') || dataInicioFormatted;
      const totalCamisetas = Object.values(grades).reduce((total, grade) => total + grade.quantidadePrevista, 0);
      
      const ordemData = {
        informacoesGerais: {
          cliente: cliente || '',
          dataInicio: dataInicioFormatted,
          dataEntrega: dataEntregaFormatted,
            status: (isRascunho ? 'Rascunho' : 'Aberta') as Status,
          observacao: observacao || '',
          totalCamisetas
        },
        solicitacao: {
          item: {
            nome: itemSelecionado.nome,
            produtoId: itemSelecionado.id
          },
          malha: {
            nome: malhaSelecionada.nome,
            produtoId: malhaSelecionada.id
          },
          ribana: {
            nome: ribanaSelecionada.nome,
            produtoId: ribanaSelecionada.id
          },
          previsoes: {
            malha: previsaoMalha,
            ribana: previsaoRibana
          }
        },
        grades
      };

      if (id) {
        const ordem = ordens.find(o => o.informacoesGerais.numero === id.padStart(4, '0'));
        if (ordem) {
          await editarOrdem(ordem.id, ordemData);
        }
      } else {
        await criarOrdem(ordemData);
      }
      
      navigate('/ordens');
    } catch (error) {
      alert('Erro ao salvar ordem de produção');
      console.error(error);
    }
  };

  return (
    <Box component="form" onSubmit={(e) => handleSubmit(e, false)}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, mt: 3 }}>
        <Typography variant="h4">{id ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção'}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={(e) => handleSubmit(e, true)}
            variant="contained"
            color="inherit"
            sx={{ bgcolor: 'grey.500', color: 'white', '&:hover': { bgcolor: 'grey.600' } }}
          >
            Salvar como Rascunho
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Iniciar Produção
          </Button>
        </Box>
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
              onChange={setDataInicio}
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
              value="Rascunho"
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
                  setGrades({});
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
                    helperText={errorProdutos}
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
                  if (!inputValue) return options;
                  
                  const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                  return options.filter(option => {
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
                  if (!inputValue) return options;
                  
                  const terms = inputValue.toLowerCase().split('&').map(term => term.trim());
                  return options.filter(option => {
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

        {Object.entries(grades).map(([gradeId, grade]) => (
          <Box key={gradeId} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
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
                    if (newValue) {
                      setGrades(prevGrades => ({
                        ...prevGrades,
                        [gradeId]: {
                          ...prevGrades[gradeId],
                          codigo: newValue.codigo || '',
                          produtoId: newValue.id,
                          nome: newValue.nome
                        }
                      }));
                    } else {
                      setGrades(prevGrades => ({
                        ...prevGrades,
                        [gradeId]: {
                          ...prevGrades[gradeId],
                          codigo: '',
                          produtoId: '',
                          nome: ''
                        }
                      }));
                    }
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
                    const filteredByParent = options.filter(option => 
                      option.idProdutoPai === itemSelecionado?.id
                    );
                    
                    // Aplica a busca por texto se houver
                    const filteredBySearch = inputValue 
                      ? filteredByParent.filter(option => {
                          const searchTerms = inputValue.toLowerCase().split('&').map(term => term.trim());
                          const searchText = `${option.nome} ${option.codigo || ''} ${option.descricaoCurta || ''}`.toLowerCase();
                          return searchTerms.every(term => searchText.includes(term));
                        })
                      : filteredByParent;

                    // Ordena os resultados usando a função sortBySize
                    return sortBySize(filteredBySearch, 'nome');
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
                    setGrades(prevGrades => ({
                      ...prevGrades,
                      [gradeId]: {
                        ...prevGrades[gradeId],
                        quantidadePrevista: Number(e.target.value)
                      }
                    }));
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
                  onClick={() => setDialogoRemocao({ aberto: true, gradeId })}
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
        onClose={() => setDialogoRemocao({ aberto: false, gradeId: null })}
      >
        <DialogTitle>Confirmar Remoção</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover este item da grade?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogoRemocao({ aberto: false, gradeId: null })}
            color="primary"
          >
            Não
          </Button>
          <Button
            onClick={() => {
              if (dialogoRemocao.gradeId) {
                setGrades(prevGrades => {
                  const newGrades = { ...prevGrades };
                  delete newGrades[dialogoRemocao.gradeId!];
                  return newGrades;
                });
              }
              setDialogoRemocao({ aberto: false, gradeId: null });
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
