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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function OrdemProducaoPage() {
  const navigate = useNavigate();
  const { ordens, loading, error, recarregarOrdens } = useOrdemProducao();

  const getStatusColor = (status: string) => {
    return status === 'Aberta' ? 'primary' : 'success';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, mt: 3 }}>
        <Typography variant="h4">
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
              <TableCell>Data Início</TableCell>
              <TableCell>Data Entrega</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Total Camisetas</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma ordem de produção encontrada
                </TableCell>
              </TableRow>
            ) : (
              ordens.map((ordem) => (
                <TableRow
                  key={ordem.numero}
                  hover
                  onClick={() => navigate(`/ordens/${ordem.numero}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{ordem.numero}</TableCell>
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
