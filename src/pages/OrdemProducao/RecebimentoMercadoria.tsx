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
  Checkbox,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function RecebimentoMercadoria() {
  const navigate = useNavigate();
  const { ordens, loading, error } = useOrdemProducao();
  const [selectedOrdens, setSelectedOrdens] = useState<string[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
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

  // Filtra ordens com status "Aberta" ou "Em Entrega"
  const ordensDisponiveis = ordens.filter(
    (ordem) => ordem.informacoesGerais.status === 'Aberta' || 
               ordem.informacoesGerais.status === 'Em Entrega'
  );

  // Calcula o total de camisetas entregues para uma ordem
  const calcularTotalEntregue = (ordem: OrdemProducao) => {
    return Object.values(ordem.grades).reduce((total, grade) => {
      if (!grade.recebimentos) return total;
      return total + grade.recebimentos.reduce((sum: number, rec: { quantidade: number }) => {
        return sum + rec.quantidade;
      }, 0);
    }, 0);
  };

  const handleToggleOrdem = (numero: string) => {
    setSelectedOrdens((prev) =>
      prev.includes(numero)
        ? prev.filter((n) => n !== numero)
        : [...prev, numero]
    );
  };

  const handleAvancar = () => {
    if (selectedOrdens.length === 0) {
      alert('Selecione pelo menos uma ordem de produção');
      return;
    }
    // Navega para a próxima página com as ordens selecionadas
    navigate(`/ordens/recebimento/detalhes?ordens=${selectedOrdens.join(',')}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
        <Typography variant="h5">
          Recebimento de Mercadoria
        </Typography>
        <Button
          variant="contained"
          onClick={handleAvancar}
          disabled={selectedOrdens.length === 0}
        >
          Avançar
        </Button>
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
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedOrdens.length > 0 &&
                      selectedOrdens.length < ordensDisponiveis.length
                    }
                    checked={
                      ordensDisponiveis.length > 0 &&
                      selectedOrdens.length === ordensDisponiveis.length
                    }
                    onChange={() => {
                      if (selectedOrdens.length === ordensDisponiveis.length) {
                        setSelectedOrdens([]);
                      } else {
                        setSelectedOrdens(
                          ordensDisponiveis.map(
                            (ordem) => ordem.informacoesGerais.numero
                          )
                        );
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Data Início</TableCell>
                <TableCell>Data Entrega</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Total Camisetas</TableCell>
                <TableCell>Total Entregue</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordensDisponiveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Nenhuma ordem de produção disponível para recebimento
                  </TableCell>
                </TableRow>
              ) : (
                ordensDisponiveis.map((ordem) => (
                  <TableRow
                    key={ordem.informacoesGerais.numero}
                    hover
                    onClick={() =>
                      handleToggleOrdem(ordem.informacoesGerais.numero)
                    }
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedOrdens.includes(
                          ordem.informacoesGerais.numero
                        )}
                      />
                    </TableCell>
                    <TableCell>{ordem.informacoesGerais.numero}</TableCell>
                    <TableCell>{ordem.solicitacao.item.nome}</TableCell>
                    <TableCell>{ordem.informacoesGerais.dataInicio}</TableCell>
                    <TableCell>{ordem.informacoesGerais.dataEntrega}</TableCell>
                    <TableCell>{ordem.informacoesGerais.cliente}</TableCell>
                    <TableCell>{ordem.informacoesGerais.totalCamisetas}</TableCell>
                    <TableCell>{calcularTotalEntregue(ordem)}</TableCell>
                    <TableCell>
                      <Chip
                        label={ordem.informacoesGerais.status}
                        color={getStatusColor(ordem.informacoesGerais.status)}
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

export default RecebimentoMercadoria;
