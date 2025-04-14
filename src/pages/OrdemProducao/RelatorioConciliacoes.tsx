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
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';

interface Filtros {
  fornecedorId: string;
  servicoId: string;
  dataPagamento: string;
  codigoConciliacao: string;
}

interface Conciliacao {
  id?: string; 
  ordemId: string;
  numeroOrdem: string | string[];
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
  fornecedorNome: string;
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
    try {
      setLoading(true);
      setSnackbar({
        open: false,
        message: '',
        severity: 'info',
      });
      
      // Buscar conciliações diretamente da coleção 'conciliacoes'
      const conciliacoesRef = ref(database, 'conciliacoes');
      const conciliacoesSnapshot = await get(conciliacoesRef);
      
      if (!conciliacoesSnapshot.exists()) {
        setLoading(false);
        setConciliacoes([]);
        return;
      }
      
      const conciliacoesData = conciliacoesSnapshot.val();
      let conciliacoesList: any[] = [];
      
      // Processar as conciliações
      for (const [id, conciliacao] of Object.entries<any>(conciliacoesData)) {
        // Verificar se a conciliação atende aos critérios de filtro
        if (
          (!filtros.fornecedorId || conciliacao.fornecedorId === filtros.fornecedorId) &&
          (!filtros.servicoId || conciliacao.servicoId === filtros.servicoId) &&
          (!filtros.dataPagamento || conciliacao.dataPagamento === filtros.dataPagamento) &&
          (!filtros.codigoConciliacao || conciliacao.codigoConciliacao === filtros.codigoConciliacao)
        ) {
          // Buscar nome do fornecedor
          let fornecedorNome = '';
          if (conciliacao.fornecedorId && fornecedores) {
            const fornecedor = fornecedores.find(f => f.id === conciliacao.fornecedorId);
            if (fornecedor) {
              fornecedorNome = fornecedor.nome;
            }
          }
          
          // Buscar informações de todas as ordens envolvidas
          let ordensInfo = [];
          let numerosOrdens = [];
          let itensOrdens = [];
          let clientesOrdens = [];
          let statusPedidosOrdens = [];
          let servicosOrdens = [];

          if (conciliacao.lancamentos && conciliacao.lancamentos.length > 0) {
            // Coletar todos os ordemId únicos
            const ordemIdsUnicos = [...new Set(conciliacao.lancamentos.map((l: any) => l.ordemId).filter(Boolean))];
            for (const ordemId of ordemIdsUnicos) {
              const ordem = ordens.find(o => o.id === ordemId);
              if (ordem) {
                ordensInfo.push(ordem);
                numerosOrdens.push(ordem.informacoesGerais?.numero || '');
                itensOrdens.push(ordem.solicitacao?.item?.nome || '');
                clientesOrdens.push(ordem.informacoesGerais?.cliente || '');
                statusPedidosOrdens.push(ordem.informacoesGerais?.status || '');
                let servicoNomeOuId = '';
                // Buscar servicoId do lançamento relacionado à ordem
                const servicoId = conciliacao.lancamentos?.find((l: any) => l.ordemId === ordem.id)?.servicoId;
                if (servicoId && servicos) {
                  const servico = servicos.find(s => s.id === servicoId);
                  if (servico && servico.nome) {
                    servicoNomeOuId = servico.nome;
                  } else {
                    servicoNomeOuId = servicoId; // fallback para mostrar o id
                  }
                }
                if (servicoNomeOuId) servicosOrdens.push(servicoNomeOuId);
              }
            }
          }

          // Garantir que todas as propriedades necessárias estejam definidas
          conciliacoesList.push({
            id,
            ordemId: numerosOrdens.join(', '),
            numeroOrdem: numerosOrdens,
            dataConciliacao: conciliacao.dataConciliacao || '',
            dataPagamento: conciliacao.dataPagamento || '',
            item: itensOrdens.join(', '),
            cliente: clientesOrdens.join(', '),
            statusPedido: statusPedidosOrdens.join(', '),
            servico: Array.from(new Set(servicosOrdens.filter(Boolean))).join(', '),
            quantidadeConciliada: conciliacao.lancamentos?.reduce((sum: number, l: any) => sum + (Number(l.quantidade) || 0), 0) || 0,
            valor: conciliacao.total ? Number(conciliacao.total) : 0,
            total: conciliacao.total ? Number(conciliacao.total) : 0,
            statusConciliacao: conciliacao.status || 'N/A',
            codigoConciliacao: conciliacao.codigoConciliacao || '',
            blingContaPagarId: conciliacao.blingContaPagarId || '',
            lancamentos: conciliacao.lancamentos || [],
            fornecedorNome
          });
        }
      }
      
      // Ordenar por data de conciliação (mais recente primeiro)
      conciliacoesList.sort((a, b) => {
        const dataA = new Date(a.dataConciliacao.split('-').reverse().join('-'));
        const dataB = new Date(b.dataConciliacao.split('-').reverse().join('-'));
        return dataB.getTime() - dataA.getTime();
      });
      
      setConciliacoes(conciliacoesList);
    } catch (error) {
      console.error('Erro ao buscar conciliações:', error);
      setSnackbar({
        open: true,
        message: `Erro ao buscar conciliações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
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
              <TableSortableHeader
                label="Fornecedor"
                field="fornecedorNome"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <Typography>Carregando...</Typography>
                </TableCell>
              </TableRow>
            ) : getSortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <Typography>Nenhuma conciliação encontrada</Typography>
                </TableCell>
              </TableRow>
            ) : (
              getSortedItems.map((conciliacao, index) => (
                <TableRow key={`${conciliacao.ordemId}-${index}`}>
                  <TableCell>{conciliacao.codigoConciliacao}</TableCell>
                  <TableCell>{Array.isArray(conciliacao.numeroOrdem) ? conciliacao.numeroOrdem.join(', ') : conciliacao.numeroOrdem}</TableCell>
                  <TableCell>{conciliacao.dataConciliacao}</TableCell>
                  <TableCell>{conciliacao.dataPagamento}</TableCell>
                  <TableCell>{conciliacao.item}</TableCell>
                  <TableCell>{conciliacao.cliente}</TableCell>
                  <TableCell>{conciliacao.statusPedido}</TableCell>
                  <TableCell>{conciliacao.servico}</TableCell>
                  <TableCell align="right">{conciliacao.quantidadeConciliada}</TableCell>
                  <TableCell align="right">R$ {(conciliacao.valor !== undefined ? Number(conciliacao.valor).toFixed(2) : '0.00')}</TableCell>
                  <TableCell align="right">R$ {(conciliacao.total !== undefined ? Number(conciliacao.total).toFixed(2) : '0.00')}</TableCell>
                  <TableCell>{conciliacao.statusConciliacao}</TableCell>
                  <TableCell>{conciliacao.fornecedorNome}</TableCell>
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
