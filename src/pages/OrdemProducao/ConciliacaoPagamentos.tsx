import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagamentos } from '../../hooks/usePagamentos';
import { useFornecedores } from '../../hooks/useFornecedores';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { useServicos } from '../../hooks/useServicos';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSorting } from '../../hooks/useSorting';
import { TableSortableHeader } from '../../components/TableSortableHeader';

interface LancamentoSelecionado {
  ordemId: string;
  pagamentoId: string;
  lancamentoIndex: number;
  valor: number;
  quantidade: number;
  servicoId: string;
  checked: boolean;
}

interface LancamentoComInfo extends LancamentoSelecionado {
  numero: string;
  item: string;
  tipoServico: string;
  cliente: string;
  dataEntrega: string;
}

function ConciliacaoPagamentos() {
  const navigate = useNavigate();
  const { fornecedores } = useFornecedores();
  const { ordens } = useOrdemProducao();
  const { buscarPagamentosPorFornecedor, criarConciliacao, enviarConciliacaoParaBling } = usePagamentos();
  const { getServicoById } = useServicos();

  const [fornecedorId, setFornecedorId] = useState('');
  const [dataPagamento, setDataPagamento] = useState<Date | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoSelecionado[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const carregarLancamentos = useCallback(async (fornecedorIdParam?: string) => {
    const idToUse = fornecedorIdParam || fornecedorId;
    if (!idToUse) {
      setLancamentos([]);
      return;
    }

    setLoading(true);
    try {
      // Buscar pagamentos do fornecedor
      const pagamentosPorFornecedor = await buscarPagamentosPorFornecedor(idToUse);
      
      // Para cada pagamento, precisamos buscar o pagamento completo
      // para obter os índices originais dos lançamentos
      const lancamentosFiltrados: LancamentoSelecionado[] = [];
      
      for (const { ordemId, pagamento } of pagamentosPorFornecedor) {
        // Buscar o pagamento completo
        const pagamentoRef = ref(database, `ordens/${ordemId}/pagamentos/${pagamento.id}`);
        const snapshot = await get(pagamentoRef);
        
        if (snapshot.exists()) {
          const pagamentoCompleto = snapshot.val();
          
          // Verificar cada lançamento do pagamento completo
          if (Array.isArray(pagamentoCompleto.lancamentos)) {
            pagamentoCompleto.lancamentos.forEach((lancamentoCompleto: any, indexOriginal: number) => {
              // Verificar se o lançamento pertence ao fornecedor e não está conciliado
              if (lancamentoCompleto.fornecedorId === idToUse && !lancamentoCompleto.conciliacao) {
                lancamentosFiltrados.push({
                  ordemId,
                  pagamentoId: pagamento.id,
                  lancamentoIndex: indexOriginal, // Este é o índice original no pagamento completo
                  valor: Number(lancamentoCompleto.total) || 0,
                  quantidade: Number(lancamentoCompleto.quantidade) || 0,
                  servicoId: lancamentoCompleto.servicoId,
                  checked: false,
                });
              }
            });
          }
        }
      }

      setLancamentos(lancamentosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
      setSnackbar({
        open: true,
        message: `Erro ao carregar lançamentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [fornecedorId, buscarPagamentosPorFornecedor]);

  const handleFornecedorChange = async (novoFornecedorId: string) => {
    setFornecedorId(novoFornecedorId);
    if (novoFornecedorId) {
      await carregarLancamentos(novoFornecedorId);
    } else {
      setLancamentos([]);
    }
  };

  const handleCheckLancamento = (index: number, checked: boolean) => {
    setLancamentos(prev =>
      prev.map((l, i) => (i === index ? { ...l, checked } : l))
    );
  };

  const handleConciliar = async () => {
    if (!fornecedorId || !dataPagamento) {
      setSnackbar({
        open: true,
        message: 'Selecione o fornecedor e a data de pagamento',
        severity: 'warning',
      });
      return;
    }

    const lancamentosSelecionados = lancamentos.filter(l => l.checked);
    if (lancamentosSelecionados.length === 0) {
      setSnackbar({
        open: true,
        message: 'Selecione pelo menos um lançamento para conciliar',
        severity: 'warning',
      });
      return;
    }

    setProcessando(true);
    try {
      // Preparar os lançamentos selecionados para conciliação
      // Usamos diretamente o índice do lançamento que foi selecionado na interface
      const lancamentosParaConciliar = lancamentosSelecionados.map(lancamento => ({
        ordemId: lancamento.ordemId,
        pagamentoId: lancamento.pagamentoId,
        lancamentoIndex: lancamento.lancamentoIndex,
        valor: lancamento.valor,
        quantidade: lancamento.quantidade,
        servicoId: lancamento.servicoId,
      }));
      
      // Passo 1: Criar a conciliação
      const codigo = await criarConciliacao(
        format(dataPagamento, 'dd-MM-yyyy'),
        lancamentosParaConciliar,
        fornecedorId
      );

      setSnackbar({
        open: true,
        message: `Conciliação ${codigo} criada com sucesso! Enviando para o Bling...`,
        severity: 'info',
      });

      // Passo 2: Enviar para o Bling
      try {
        await enviarConciliacaoParaBling(codigo);
        setSnackbar({
          open: true,
          message: `Conciliação ${codigo} criada e enviada com sucesso para o Bling!`,
          severity: 'success',
        });
        
        // Redirecionar após sucesso
        setTimeout(() => {
          navigate('/ordens/pagamento');
        }, 2000);
      } catch (blingError) {
        console.error('Erro ao enviar para o Bling:', blingError);
        setSnackbar({
          open: true,
          message: `Conciliação criada, mas houve um erro ao enviar para o Bling: ${blingError instanceof Error ? blingError.message : 'Erro desconhecido'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Erro ao criar conciliação:', error);
      setSnackbar({
        open: true,
        message: `Erro ao criar conciliação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'error',
      });
    } finally {
      setProcessando(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getOrdemInfo = useCallback((ordemId: string) => {
    const ordem = ordens.find(o => o.id === ordemId);
    if (!ordem?.informacoesGerais) return null;
    
    return {
      numero: ordem.informacoesGerais.numero || '',
      cliente: ordem.informacoesGerais.cliente || '',
      item: ordem.solicitacao?.item?.nome || '',
      dataEntrega: ordem.informacoesGerais.dataEntrega || '',
    };
  }, [ordens]);

  // Prepara os dados para ordenação com as informações completas
  const lancamentosComInfo: LancamentoComInfo[] = lancamentos.map(lancamento => {
    const ordemInfo = getOrdemInfo(lancamento.ordemId);
    const servico = getServicoById(lancamento.servicoId);
    
    return {
      ...lancamento,
      numero: ordemInfo?.numero || '',
      item: ordemInfo?.item || '',
      tipoServico: servico?.nome || 'N/A',
      cliente: ordemInfo?.cliente || '',
      dataEntrega: ordemInfo?.dataEntrega || '',
    };
  });

  const { sortConfigs, requestSort, getSortedItems } = useSorting(lancamentosComInfo);

  const totalSelecionado = lancamentos
    .filter(l => l.checked)
    .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
          <Typography variant="h5">Conciliação de Pagamentos</Typography>
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
              onClick={handleConciliar}
              disabled={processando || !fornecedorId || !dataPagamento || lancamentos.filter(l => l.checked).length === 0}
              startIcon={processando ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {processando ? 'Processando...' : 'Conciliar e Enviar'}
            </Button>
          </Box>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Fornecedor</InputLabel>
              <Select
                value={fornecedorId}
                onChange={(e) => handleFornecedorChange(e.target.value)}
                label="Fornecedor"
              >
                <MenuItem value="">
                  <em>Selecione um fornecedor</em>
                </MenuItem>
                {fornecedores
                  .filter((f) => f.situacao === 'A')
                  .map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome} <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>({fornecedor.id})</Typography>
                    </MenuItem>
                  ))}
              </Select>
              {fornecedorId && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  ID do fornecedor: {fornecedorId}
                </Typography>
              )}
            </FormControl>

            <DatePicker
              label="Data de Pagamento"
              value={dataPagamento}
              onChange={setDataPagamento}
              format="dd/MM/yyyy"
              disabled={!fornecedorId}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 200 }
                }
              }}
            />

            <IconButton 
              onClick={() => carregarLancamentos()} 
              disabled={!fornecedorId || loading}
              color="primary"
              title="Atualizar lançamentos"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Lista de Lançamentos */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    disabled={!fornecedorId || lancamentos.length === 0}
                    checked={
                      lancamentos.length > 0 &&
                      lancamentos.every((l) => l.checked)
                    }
                    indeterminate={
                      lancamentos.some((l) => l.checked) &&
                      !lancamentos.every((l) => l.checked)
                    }
                    onChange={(e) =>
                      setLancamentos((prev) =>
                        prev.map((l) => ({ ...l, checked: e.target.checked }))
                      )
                    }
                  />
                </TableCell>
                <TableSortableHeader
                  label="Número"
                  field="numero"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Item"
                  field="item"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Tipo de Serviço"
                  field="tipoServico"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Cliente"
                  field="cliente"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Data Entrega"
                  field="dataEntrega"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Valor"
                  field="valor"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Carregando lançamentos...
                  </TableCell>
                </TableRow>
              ) : getSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {fornecedorId
                      ? "Nenhum lançamento encontrado"
                      : "Selecione um fornecedor para ver os lançamentos"}
                  </TableCell>
                </TableRow>
              ) : (
                getSortedItems.map((lancamento) => (
                  <TableRow key={`${lancamento.ordemId}-${lancamento.pagamentoId}-${lancamento.lancamentoIndex}`}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={lancamento.checked}
                        onChange={(e) =>
                          handleCheckLancamento(
                            lancamentos.findIndex(
                              l =>
                                l.ordemId === lancamento.ordemId &&
                                l.pagamentoId === lancamento.pagamentoId &&
                                l.lancamentoIndex === lancamento.lancamentoIndex
                            ),
                            e.target.checked
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{lancamento.numero}</TableCell>
                    <TableCell>{lancamento.item}</TableCell>
                    <TableCell>{lancamento.tipoServico}</TableCell>
                    <TableCell>{lancamento.cliente}</TableCell>
                    <TableCell>{lancamento.dataEntrega}</TableCell>
                    <TableCell align="right">
                      {`R$ ${Number(lancamento.valor).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total */}
        {lancamentos.some(l => l.checked) && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" align="right">
              Total Selecionado: R$ {totalSelecionado.toFixed(2)}
            </Typography>
          </Paper>
        )}

        {/* Snackbar para mensagens */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}

export default ConciliacaoPagamentos;
