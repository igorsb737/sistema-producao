import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { usePagamentos } from '../../hooks/usePagamentos';
import type { Lancamento } from '../../hooks/usePagamentos';
import { useFornecedores } from '../../hooks/useFornecedores';
import { format } from 'date-fns';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  IconButton,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Assessment as AssessmentIcon } from '@mui/icons-material';

interface NovoLancamento extends Omit<Lancamento, 'data'> {
  fornecedorId: string;
  servicoId: string;
  valor: number;
  quantidade: number;
  total: number;
}

const lancamentoInicial: NovoLancamento = {
  fornecedorId: '',
  servicoId: '',
  valor: 0,
  quantidade: 0,
  total: 0,
};

function PagamentoDetalhes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ordens, loading: loadingOrdens, error: errorOrdens } = useOrdemProducao();
  const { fornecedores, loading: loadingFornecedores } = useFornecedores();
  const { buscarPagamentos, adicionarPagamento, calcularTotalPago } = usePagamentos();
  
  const [lancamentos, setLancamentos] = useState<NovoLancamento[]>([lancamentoInicial]);
  const [ordem, setOrdem] = useState<any>(null);
  const [servicos, setServicos] = useState<Array<{
    id: string;
    nome: string;
    situacao: string;
    afetaEstoque: boolean;
  }>>([]);
  const [totalEntregue, setTotalEntregue] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [pagamentosExistentes, setPagamentosExistentes] = useState<Array<any>>([]);

  // Carrega os serviços do Firebase
  useEffect(() => {
    const carregarServicos = async () => {
      try {
        const servicosRef = ref(database, 'servicos');
        const snapshot = await get(servicosRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const servicosList = Object.entries(data)
            .filter(([_, servico]: [string, any]) => servico.situacao === 'A')
            .map(([id, servico]: [string, any]) => ({
              id,
              ...servico,
              // Por padrão, serviços de corte e costura afetam o estoque
              afetaEstoque: servico.nome.toLowerCase().includes('costura'),
            }));
          setServicos(servicosList);
        }
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
      }
    };

    carregarServicos();
  }, []);

  // Carrega a ordem e seus pagamentos
  useEffect(() => {
    const numeroOrdem = searchParams.get('ordem');
    if (!numeroOrdem || !ordens.length) return;

    const ordemEncontrada = ordens.find(
      (o) => o.informacoesGerais.numero === numeroOrdem
    );

    if (ordemEncontrada) {
      setOrdem(ordemEncontrada);
      
      // Calcula total entregue
      const totalEntregueCalc = Object.values(ordemEncontrada.grades).reduce(
        (total, grade) => {
          if (!grade.recebimentos) return total;
          return (
            total +
            grade.recebimentos.reduce(
              (sum: number, rec: { quantidade: number }) => sum + rec.quantidade,
              0
            )
          );
        },
        0
      );
      setTotalEntregue(totalEntregueCalc);

      // Busca pagamentos existentes
      buscarPagamentos(ordemEncontrada.id).then((pagamentos) => {
        const { quantidade } = calcularTotalPago(pagamentos);
        setTotalPago(quantidade);
        setPagamentosExistentes(pagamentos);
      });
    }
  }, [ordens, searchParams]);

  const handleAddLancamento = (index?: number) => {
    if (typeof index === 'number') {
      // Adiciona após o índice especificado
      const novosLancamentos = [...lancamentos];
      novosLancamentos.splice(index + 1, 0, { ...lancamentoInicial });
      setLancamentos(novosLancamentos);
    } else {
      // Adiciona ao final
      setLancamentos([...lancamentos, { ...lancamentoInicial }]);
    }
  };

  const handleRemoveLancamento = (index: number) => {
    setLancamentos(lancamentos.filter((_, i) => i !== index));
  };

  const handleLancamentoChange = (index: number, field: keyof NovoLancamento, value: any) => {
    const novosLancamentos = [...lancamentos];
    novosLancamentos[index] = {
      ...novosLancamentos[index],
      [field]: value,
    };

    // Atualiza o total se valor ou quantidade mudarem
    if (field === 'valor' || field === 'quantidade') {
      novosLancamentos[index].total =
        novosLancamentos[index].valor * novosLancamentos[index].quantidade;
    }

    setLancamentos(novosLancamentos);
  };

  const handleSalvar = async () => {
    try {
      // Valida se todos os campos obrigatórios estão preenchidos
      const lancamentosInvalidos = lancamentos.some(
        (l) => !l.fornecedorId || !l.servicoId || l.quantidade <= 0 || l.valor <= 0
      );

      if (lancamentosInvalidos) {
        alert('Preencha todos os campos obrigatórios');
        return;
      }

      // Valida quantidade total apenas para serviços que afetam o estoque
      const quantidadeTotal = lancamentos.reduce((total, l) => {
        const servico = servicos.find(s => s.id === l.servicoId);
        return total + (servico?.afetaEstoque ? l.quantidade : 0);
      }, 0);
      
      if (quantidadeTotal > totalEntregue - totalPago) {
        alert('Quantidade total de serviços que afetam o estoque excede o limite disponível');
        return;
      }

      // Prepara os lançamentos para salvar com a data atual
      const dataAtual = new Date();
      const lancamentosFormatados = lancamentos.map((l) => {
        const servico = servicos.find(s => s.id === l.servicoId);
        return {
          ...l,
          data: format(dataAtual, 'dd-MM-yyyy HH:mm:ss'),
          afetaEstoque: servico?.afetaEstoque || false,
        };
      });

      await adicionarPagamento(ordem.id, { lancamentos: lancamentosFormatados });
      navigate('/ordens/pagamento');
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      alert('Erro ao salvar pagamento. Tente novamente.');
    }
  };

  if (loadingOrdens || loadingFornecedores) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (errorOrdens) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography color="error">{errorOrdens}</Typography>
      </Box>
    );
  }

  if (!ordem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Ordem não encontrada</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
        <Typography variant="h5">Detalhes do Pagamento</Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/ordens/pagamento')}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={handleSalvar}
            disabled={lancamentos.length === 0}
          >
            Enviar Lançamento
          </Button>
        </Box>
      </Box>

      {/* Pagamentos Existentes */}
      {pagamentosExistentes.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Pagamentos Existentes</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Fornecedor</TableCell>
                  <TableCell>Serviço</TableCell>
                  <TableCell>Quantidade</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status Conciliação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagamentosExistentes.map((pagamento) => (
                  pagamento.lancamentos.map((lancamento: any, index: number) => {
                    const fornecedor = fornecedores.find(f => f.id === lancamento.fornecedorId);
                    const servico = servicos.find(s => s.id === lancamento.servicoId);
                    
                    return (
                      <TableRow 
                        key={`${pagamento.id}-${index}`}
                        sx={pagamento.conciliacao ? {
                          backgroundColor: 'rgba(76, 175, 80, 0.08)'
                        } : undefined}
                      >
                        <TableCell>{lancamento.data}</TableCell>
                        <TableCell>{fornecedor?.nome || 'N/A'}</TableCell>
                        <TableCell>{servico?.nome || 'N/A'}</TableCell>
                        <TableCell align="right">{lancamento.quantidade}</TableCell>
                        <TableCell align="right">R$ {lancamento.valor.toFixed(2)}</TableCell>
                        <TableCell align="right">R$ {lancamento.total.toFixed(2)}</TableCell>
                        <TableCell>
                          {pagamento.conciliacao ? (
                            <Button
                              variant="text"
                              color="primary"
                              onClick={() => navigate(`/ordens/pagamento/conciliacao/detalhes?ordem=${ordem.id}&pagamento=${pagamento.id}`)}
                            >
                              {pagamento.conciliacao.status} ({pagamento.conciliacao.dataPagamento})
                            </Button>
                          ) : 'Não conciliado'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Box de informações da OP */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Item
            </Typography>
            <Typography variant="body1">{ordem.solicitacao.item.nome}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Quantidade Total Entregue
            </Typography>
            <Typography variant="body1">{totalEntregue}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Quantidade Total Paga
            </Typography>
            <Typography variant="body1">{totalPago}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Lançamentos */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Lançamentos</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => handleAddLancamento()}
            variant="outlined"
            size="small"
          >
            Adicionar Lançamento
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fornecedor</TableCell>
                <TableCell>Serviço</TableCell>
                <TableCell>Valor (R$)</TableCell>
                <TableCell>Quantidade</TableCell>
                <TableCell>Total</TableCell>
                  <TableCell width={100} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lancamentos.map((lancamento, index) => (
                <TableRow key={index}>
                  <TableCell style={{ width: '300px' }}>
                    <FormControl fullWidth size="small" sx={{ width: '300px' }}>
                      <InputLabel>Fornecedor</InputLabel>
                      <Select
                        value={lancamento.fornecedorId}
                        onChange={(e) =>
                          handleLancamentoChange(index, 'fornecedorId', e.target.value)
                        }
                        label="Fornecedor"
                      >
                        {fornecedores
                          .filter((f) => f.situacao === 'A')
                          .map((fornecedor) => (
                            <MenuItem key={fornecedor.id} value={fornecedor.id}>
                              {fornecedor.nome}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell style={{ width: '250px' }}>
                    <FormControl fullWidth size="small" sx={{ width: '250px' }}>
                      <InputLabel>Serviço</InputLabel>
                      <Select
                        value={lancamento.servicoId}
                        onChange={(e) =>
                          handleLancamentoChange(index, 'servicoId', e.target.value)
                        }
                        label="Serviço"
                      >
                        {servicos.map((servico) => (
                          <MenuItem key={servico.id} value={servico.id}>
                            {servico.nome}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell style={{ width: '120px' }}>
                    <TextField
                      type="number"
                      size="small"
                      value={lancamento.valor || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        handleLancamentoChange(
                          index,
                          'valor',
                          parseFloat(value) || 0
                        );
                      }}
                      inputProps={{ 
                        min: 0, 
                        step: "0.01",
                        style: { textAlign: 'right' }
                      }}
                      sx={{
                        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                          display: 'none',
                        },
                        '& input[type=number]': {
                          MozAppearance: 'textfield',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell style={{ width: '120px' }}>
                    <TextField
                      type="number"
                      size="small"
                      value={lancamento.quantidade || ''}
                      onChange={(e) =>
                        handleLancamentoChange(
                          index,
                          'quantidade',
                          parseInt(e.target.value) || 0
                        )
                      }
                      inputProps={{
                        min: 0,
                        max: servicos.find(s => s.id === lancamento.servicoId)?.afetaEstoque 
                          ? totalEntregue - totalPago 
                          : undefined,
                        style: { textAlign: 'right' }
                      }}
                      sx={{
                        width: '120px',
                        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                          display: 'none',
                        },
                        '& input[type=number]': {
                          MozAppearance: 'textfield',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography>
                      R$ {(lancamento.total || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddLancamento(index);
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveLancamento(index)}
                        disabled={lancamentos.length === 1}
                        tabIndex={-1}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Totais */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="subtitle1">
            Total Geral: R${' '}
            {lancamentos
              .reduce((total, l) => total + (l.total || 0), 0)
              .toFixed(2)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default PagamentoDetalhes;
