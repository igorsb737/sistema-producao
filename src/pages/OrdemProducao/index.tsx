import { useState } from 'react';
import { useOrdemProducao, type OrdemProducao } from '../../hooks/useOrdemProducao';
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
  Chip,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ptBR from 'date-fns/locale/pt-BR';
import { Add as AddIcon, PictureAsPdf as PdfIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSorting } from '../../hooks/useSorting';
import { TableSortableHeader } from '../../components/TableSortableHeader';
import { downloadOrdemPDF } from '../../utils/pdfGenerator';

function OrdemProducaoPage() {
  const navigate = useNavigate();
  const { ordens, loading, error, recarregarOrdens, excluirOrdem } = useOrdemProducao();
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroItem, setFiltroItem] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | null>(null);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<{ open: boolean; ordemId?: string }>({ open: false });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success'|'error' }>({ open: false, message: '' });

  const ordensFiltered = ordens.filter((ordem) => {
    const matchStatus = !filtroStatus || ordem.informacoesGerais.status === filtroStatus;
    const matchCliente = !filtroCliente || ordem.informacoesGerais.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchItem = !filtroItem || ordem.solicitacao.item.nome.toLowerCase().includes(filtroItem.toLowerCase());
    
    let matchData = true;
    if (filtroDataInicio && filtroDataFim) {
      const dataEntrega = new Date(ordem.informacoesGerais.dataEntrega.split('-').reverse().join('-'));
      matchData = dataEntrega >= filtroDataInicio && dataEntrega <= filtroDataFim;
    }

    return matchStatus && matchCliente && matchItem && matchData;
  });

  // Prepara os dados para ordenação com as propriedades corretas
  interface OrdemParaOrdenacao extends OrdemProducao {
    numero: string;
    item: string;
    dataInicio: string;
    dataEntrega: string;
    cliente: string;
    totalCamisetas: number;
    camisetasEntregues: number;
    status: string;
  }

  const ordensParaOrdenacao: OrdemParaOrdenacao[] = ordensFiltered.map(ordem => {
    const camisetasEntregues = Object.values(ordem.grades || {}).reduce((total, grade) => {
      return total + (grade.recebimentos?.reduce((sum, rec) => sum + rec.quantidade, 0) || 0);
    }, 0);

    return {
      ...ordem,
      numero: ordem.informacoesGerais.numero,
      item: ordem.solicitacao.item.nome,
      dataInicio: ordem.informacoesGerais.dataInicio,
      dataEntrega: ordem.informacoesGerais.dataEntrega,
      cliente: ordem.informacoesGerais.cliente,
      totalCamisetas: ordem.informacoesGerais.totalCamisetas,
      camisetasEntregues,
      status: ordem.informacoesGerais.status
    };
  });

  const { sortConfigs, requestSort, getSortedItems } = useSorting(ordensParaOrdenacao, {
    initialSort: [{ key: 'numero', direction: 'desc' }]
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Rascunho':
        return 'default';
      case 'Aberta':
        return 'primary';
      case 'Em Entrega':
        return 'warning';
      case 'Finalizado':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
        <Typography variant="h5">
          Ordens de Produção
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={recarregarOrdens}
            sx={{ mr: 2 }}
          >
            Recarregar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/ordens/nova')}
          >
            Nova Produção
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 0.8, mb: 2 }}>
        <Grid container spacing={0.8} alignItems="center">
          <style>
            {`
              .MuiInputBase-root {
                height: 35px;
              }
              .MuiInputLabel-root {
                transform: translate(14px, 8px) scale(1);
                &.Mui-focused, &.MuiInputLabel-shrink {
                  transform: translate(14px, -6px) scale(0.75);
                }
              }
            `}
          </style>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              label="Status"
              size="small"
              variant="outlined"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              InputLabelProps={{ 
                shrink: true,
                sx: { fontSize: '0.9rem' }
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="Rascunho">Rascunho</MenuItem>
              <MenuItem value="Aberta">Aberta</MenuItem>
              <MenuItem value="Finalizado">Finalizado</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Cliente"
              size="small"
              variant="outlined"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              InputLabelProps={{ 
                shrink: true,
                sx: { fontSize: '0.9rem' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Item"
              size="small"
              variant="outlined"
              value={filtroItem}
              onChange={(e) => setFiltroItem(e.target.value)}
              InputLabelProps={{ 
                shrink: true,
                sx: { fontSize: '0.9rem' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Entrega Inicial"
                value={filtroDataInicio}
                onChange={(newValue) => setFiltroDataInicio(newValue)}
                format="dd/MM/yyyy"
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    size: 'small', 
                    variant: 'outlined',
                    InputLabelProps: { 
                      shrink: true,
                      sx: { fontSize: '0.9rem' }
                    }
                  } 
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Entrega Final"
                value={filtroDataFim}
                onChange={(newValue) => setFiltroDataFim(newValue)}
                format="dd/MM/yyyy"
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    size: 'small', 
                    variant: 'outlined',
                    InputLabelProps: { 
                      shrink: true,
                      sx: { fontSize: '0.9rem' }
                    }
                  } 
                }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Carregando ordens de produção...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableSortableHeader
                label="Ordem"
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
                label="Data Início"
                field="dataInicio"
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
                label="Cliente"
                field="cliente"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Total Camisetas"
                field="totalCamisetas"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Camisetas Entregues"
                field="camisetasEntregues"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Status"
                field="status"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Nenhuma ordem de produção encontrada
                </TableCell>
              </TableRow>
            ) : (
              getSortedItems.map((ordem) => (
                <TableRow
                  key={ordem.informacoesGerais.numero}
                  hover
                  onClick={() => navigate(`/ordens/${ordem.informacoesGerais.numero}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{ordem.informacoesGerais.numero}</TableCell>
                  <TableCell>{ordem.solicitacao.item.nome}</TableCell>
                  <TableCell>{ordem.informacoesGerais.dataInicio}</TableCell>
                  <TableCell>{ordem.informacoesGerais.dataEntrega}</TableCell>
                  <TableCell>{ordem.informacoesGerais.cliente}</TableCell>
                  <TableCell>{ordem.informacoesGerais.totalCamisetas}</TableCell>
                  <TableCell>
                    {Object.values(ordem.grades || {}).reduce((total, grade) => {
                      return total + (grade.recebimentos?.reduce((sum, rec) => sum + rec.quantidade, 0) || 0);
                    }, 0)}
                  </TableCell>
                  <TableCell sx={{ minWidth: 80, maxWidth: 90, width: 90 }}>
                    <Chip
                      label={ordem.informacoesGerais.status}
                      color={getStatusColor(ordem.informacoesGerais.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} sx={{ minWidth: 110, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Baixar PDF">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadOrdemPDF(ordem);
                        }}
                      >
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                    {ordem.informacoesGerais.status === 'Aberta' && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ordens/editar/${ordem.informacoesGerais.numero}`);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmarExclusao({ open: true, ordemId: ordem.id });
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}
      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={confirmarExclusao.open} onClose={() => setConfirmarExclusao({ open: false })}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>Tem certeza que deseja excluir esta ordem de produção?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarExclusao({ open: false })} color="primary">Cancelar</Button>
          <Button
            onClick={async () => {
              if (confirmarExclusao.ordemId) {
                try {
                  await excluirOrdem(confirmarExclusao.ordemId);
                  setSnackbar({ open: true, message: 'Ordem excluída com sucesso!', severity: 'success' });
                } catch {
                  setSnackbar({ open: true, message: 'Erro ao excluir ordem.', severity: 'error' });
                }
              }
              setConfirmarExclusao({ open: false });
            }}
            color="error"
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar de feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default OrdemProducaoPage;
