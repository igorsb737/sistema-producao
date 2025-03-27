import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagamentos } from '../../hooks/usePagamentos';
import { useFornecedores } from '../../hooks/useFornecedores';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { useServicos } from '../../hooks/useServicos';
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
  TextField,
  Button,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Assessment as AssessmentIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useSorting } from '../../hooks/useSorting';
import { TableSortableHeader } from '../../components/TableSortableHeader';

interface Filtros {
  fornecedorId: string;
  servicoId: string;
  dataPagamento: string;
  codigoConciliacao: string;
}

interface Conciliacao {
  id?: string; 
  ordemId: string;
  numeroOrdem: string;
  dataConciliacao: string;
  dataPagamento: string;
  item: string;
  cliente: string;
  statusPedido: string;
  servico: string;
  quantidadeConciliada: number;
  valor: number;
  total: number;
  statusConciliacao: string;
  codigoConciliacao?: string;
  blingContaPagarId?: string; 
  lancamentos?: Array<any>; 
}

function RelatorioConciliacoes() {
  const navigate = useNavigate();
  const { fornecedores } = useFornecedores();
  const { ordens } = useOrdemProducao();
  const { buscarPagamentos, atualizarStatusConciliacoes } = usePagamentos();
  
  const [filtros, setFiltros] = useState<Filtros>({
    fornecedorId: '',
    servicoId: '',
    dataPagamento: '',
    codigoConciliacao: '',
  });
  
  const { servicos, getServicoById } = useServicos();
  
  const [conciliacoes, setConciliacoes] = useState<Conciliacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const buscarConciliacoes = async () => {
    setLoading(true);
    try {
      const conciliacoesTemp: Conciliacao[] = [];
      
      for (const ordem of ordens) {
        const pagamentos = await buscarPagamentos(ordem.id);
        
        const pagamentosConciliados = pagamentos.filter(p => p.conciliacao);
        
        for (const pagamento of pagamentosConciliados) {
          const lancamentosFiltrados = pagamento.lancamentos.filter(l => {
            const matchFornecedor = !filtros.fornecedorId || l.fornecedorId === filtros.fornecedorId;
            const matchServico = !filtros.servicoId || l.servicoId === filtros.servicoId;
            const matchData = !filtros.dataPagamento || 
              pagamento.conciliacao?.dataPagamento.includes(filtros.dataPagamento);
            const matchCodigo = !filtros.codigoConciliacao || 
              (pagamento.conciliacao?.codigoConciliacao && 
               pagamento.conciliacao.codigoConciliacao.toLowerCase().includes(filtros.codigoConciliacao.toLowerCase()));
            
            return matchFornecedor && matchServico && matchData && matchCodigo;
          });

          if (lancamentosFiltrados.length > 0) {
            let conciliacaoId = '';
            let blingContaPagarId = '';
            
            if (pagamento.conciliacao?.codigoConciliacao) {
              conciliacaoId = pagamento.conciliacao.codigoConciliacao;
              blingContaPagarId = pagamento.conciliacao.blingContaPagarId || '';
            }
            
            for (const lancamento of lancamentosFiltrados) {
              const lancamentoConciliado = pagamento.conciliacao?.lancamentosSelecionados.find(
                l => l.index === lancamentosFiltrados.indexOf(lancamento)
              );
              
              const servico = getServicoById(lancamentoConciliado?.servicoId || lancamento.servicoId);
              
              conciliacoesTemp.push({
                id: conciliacaoId,
                ordemId: ordem.id,
                numeroOrdem: ordem.informacoesGerais.numero,
                dataConciliacao: pagamento.conciliacao?.dataConciliacao || '',
                dataPagamento: pagamento.conciliacao?.dataPagamento || '',
                item: ordem.solicitacao.item.nome,
                cliente: ordem.informacoesGerais.cliente,
                statusPedido: ordem.informacoesGerais.status,
                servico: servico?.nome || 'N/A',
                quantidadeConciliada: lancamento.quantidade,
                valor: lancamento.valor,
                total: lancamento.total,
                statusConciliacao: pagamento.conciliacao?.status || 'N/A',
                codigoConciliacao: pagamento.conciliacao?.codigoConciliacao || 'N/A',
                blingContaPagarId: blingContaPagarId,
                lancamentos: [{ 
                  ordemId: ordem.id, 
                  pagamentoId: pagamento.id, 
                  lancamentoIndex: lancamentosFiltrados.indexOf(lancamento)
                }]
              });
            }
          }
        }
      }
      
      setConciliacoes(conciliacoesTemp);
    } catch (error) {
      console.error('Erro ao buscar conciliações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao buscar conciliações. Tente novamente.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleAtualizarStatus = async () => {
    if (conciliacoes.length === 0) {
      setSnackbar({
        open: true,
        message: 'Nenhuma conciliação para atualizar.',
        severity: 'warning',
      });
      return;
    }

    setAtualizandoStatus(true);
    try {
      // Remover filtro de status, considerar todas as conciliações com ID Bling
      const conciliacoesParaAtualizar = conciliacoes.filter(
        c => c.blingContaPagarId
      );

      if (conciliacoesParaAtualizar.length === 0) {
        setSnackbar({
          open: true,
          message: 'Nenhuma conciliação com ID Bling para atualizar.',
          severity: 'info',
        });
        setAtualizandoStatus(false);
        return;
      }

      const resultado = await atualizarStatusConciliacoes(conciliacoesParaAtualizar);
      
      if (resultado.atualizadas > 0) {
        setSnackbar({
          open: true,
          message: `${resultado.atualizadas} de ${resultado.total} conciliações atualizadas com sucesso!`,
          severity: 'success',
        });
        buscarConciliacoes();
      } else {
        setSnackbar({
          open: true,
          message: `Nenhuma conciliação precisou ser atualizada. ${resultado.total} verificadas.`,
          severity: 'info',
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status das conciliações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status das conciliações. Tente novamente.',
        severity: 'error',
      });
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const { sortConfigs, requestSort, getSortedItems } = useSorting(conciliacoes);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon /> Relatório de Conciliações
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Atualizar status das conciliações visíveis">
            <Button
              variant="contained"
              color="secondary"
              onClick={handleAtualizarStatus}
              disabled={atualizandoStatus || conciliacoes.length === 0}
              startIcon={atualizandoStatus ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            >
              {atualizandoStatus ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Fornecedor</InputLabel>
              <Select
                value={filtros.fornecedorId}
                onChange={(e) => handleFiltroChange('fornecedorId', e.target.value)}
                label="Fornecedor"
              >
                <MenuItem value="">Todos</MenuItem>
                {fornecedores
                  .filter((f) => f.situacao === 'A')
                  .map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.nome}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Serviço</InputLabel>
              <Select
                value={filtros.servicoId}
                onChange={(e) => handleFiltroChange('servicoId', e.target.value)}
                label="Serviço"
              >
                <MenuItem value="">Todos</MenuItem>
                {servicos.map((servico) => (
                  <MenuItem key={servico.id} value={servico.id}>
                    {servico.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Data de Pagamento"
              type="date"
              value={filtros.dataPagamento}
              onChange={(e) => handleFiltroChange('dataPagamento', e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Código de Conciliação"
              value={filtros.codigoConciliacao}
              onChange={(e) => handleFiltroChange('codigoConciliacao', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              onClick={buscarConciliacoes}
              fullWidth
            >
              Buscar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Resultados */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableSortableHeader
                label="Código"
                field="codigoConciliacao"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Ordem de Produção"
                field="numeroOrdem"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Data Conciliação"
                field="dataConciliacao"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Data Pagamento"
                field="dataPagamento"
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
                label="Cliente"
                field="cliente"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Status Pedido"
                field="statusPedido"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Serviço"
                field="servico"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Qtd. Conciliada"
                field="quantidadeConciliada"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Valor"
                field="valor"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Total"
                field="total"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Status Conciliação"
                field="statusConciliacao"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography>Carregando...</Typography>
                </TableCell>
              </TableRow>
            ) : getSortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography>Nenhuma conciliação encontrada</Typography>
                </TableCell>
              </TableRow>
            ) : (
              getSortedItems.map((conciliacao, index) => (
                <TableRow key={`${conciliacao.ordemId}-${index}`}>
                  <TableCell>{conciliacao.codigoConciliacao}</TableCell>
                  <TableCell>{conciliacao.numeroOrdem}</TableCell>
                  <TableCell>{conciliacao.dataConciliacao}</TableCell>
                  <TableCell>{conciliacao.dataPagamento}</TableCell>
                  <TableCell>{conciliacao.item}</TableCell>
                  <TableCell>{conciliacao.cliente}</TableCell>
                  <TableCell>{conciliacao.statusPedido}</TableCell>
                  <TableCell>{conciliacao.servico}</TableCell>
                  <TableCell align="right">{conciliacao.quantidadeConciliada}</TableCell>
                  <TableCell align="right">R$ {conciliacao.valor.toFixed(2)}</TableCell>
                  <TableCell align="right">R$ {conciliacao.total.toFixed(2)}</TableCell>
                  <TableCell>{conciliacao.statusConciliacao}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
  );
}

export default RelatorioConciliacoes;
