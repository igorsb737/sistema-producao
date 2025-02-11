import { useState } from 'react';
import { useOrdemProducao, OrdemProducao } from '../../hooks/useOrdemProducao';
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
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ptBR from 'date-fns/locale/pt-BR';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function OrdemProducaoPage() {
  const navigate = useNavigate();
  const { ordens, loading, error, recarregarOrdens } = useOrdemProducao();
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroItem, setFiltroItem] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | null>(null);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | null>(null);

  const ordensFiltered = ordens.filter((ordem) => {
    const matchStatus = !filtroStatus || ordem.status === filtroStatus;
    const matchCliente = !filtroCliente || ordem.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchItem = !filtroItem || ordem.item.toLowerCase().includes(filtroItem.toLowerCase());
    
    let matchData = true;
    if (filtroDataInicio && filtroDataFim) {
      const dataEntrega = new Date(ordem.dataEntrega.split('-').reverse().join('-'));
      matchData = dataEntrega >= filtroDataInicio && dataEntrega <= filtroDataFim;
    }

    return matchStatus && matchCliente && matchItem && matchData;
  });

  const getStatusColor = (status: string) => {
    return status === 'Aberta' ? 'primary' : 'success';
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
            Nova Ordem
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
              <TableCell>Número</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Data Início</TableCell>
              <TableCell>Data Entrega</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Total Camisetas</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordensFiltered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma ordem de produção encontrada
                </TableCell>
              </TableRow>
            ) : (
              ordensFiltered.map((ordem) => (
                <TableRow
                  key={ordem.numero}
                  hover
                  onClick={() => navigate(`/ordens/${ordem.numero}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{ordem.numero}</TableCell>
                  <TableCell>{ordem.item}</TableCell>
                  <TableCell>{ordem.dataInicio}</TableCell>
                  <TableCell>{ordem.dataEntrega}</TableCell>
                  <TableCell>{ordem.cliente}</TableCell>
                  <TableCell>{ordem.totalCamisetas}</TableCell>
                  <TableCell>
                    <Chip
                      label={ordem.status}
                      color={getStatusColor(ordem.status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}
    </Box>
  );
}

export default OrdemProducaoPage;
