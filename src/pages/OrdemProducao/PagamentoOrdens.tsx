import { useState, useEffect } from 'react';
import { useOrdemProducao, OrdemProducao } from '../../hooks/useOrdemProducao';
import { usePagamentos } from '../../hooks/usePagamentos';
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
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function PagamentoOrdens() {
  const navigate = useNavigate();
  const { ordens, loading, error } = useOrdemProducao();
  const { buscarPagamentos, calcularTotalPago } = usePagamentos();
  const [totaisPagos, setTotaisPagos] = useState<Record<string, { quantidade: number; valor: number }>>({});

  // Carrega os pagamentos para cada ordem
  useEffect(() => {
    const carregarPagamentos = async () => {
      const totais: Record<string, { quantidade: number; valor: number }> = {};
      
      for (const ordem of ordens) {
        if (ordem.informacoesGerais.status === 'Em Entrega') {
          const pagamentos = await buscarPagamentos(ordem.id);
          totais[ordem.id] = calcularTotalPago(pagamentos);
        }
      }
      
      setTotaisPagos(totais);
    };

    if (ordens.length > 0) {
      carregarPagamentos();
    }
  }, [ordens, buscarPagamentos, calcularTotalPago]);

  // Filtra apenas ordens com status "Em Entrega"
  const ordensDisponiveis = ordens.filter(
    (ordem) => ordem.informacoesGerais.status === 'Em Entrega'
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

  const handleRowClick = (numero: string) => {
    navigate(`/ordens/pagamento/detalhes?ordem=${numero}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 1.5, mt: 2 }}>
        <Typography variant="h5">
          Pagamento de Fornecedores
        </Typography>
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
                <TableCell>Item</TableCell>
                <TableCell>Data Início</TableCell>
                <TableCell>Data Entrega</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Total Camisetas</TableCell>
                <TableCell>Total Entregue</TableCell>
                <TableCell>Total Lançado</TableCell>
                <TableCell>Valor Total Lançado</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordensDisponiveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Nenhuma ordem de produção disponível para pagamento
                  </TableCell>
                </TableRow>
              ) : (
                ordensDisponiveis.map((ordem) => (
                  <TableRow
                    key={ordem.informacoesGerais.numero}
                    hover
                    onClick={() => handleRowClick(ordem.informacoesGerais.numero)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{ordem.informacoesGerais.numero}</TableCell>
                    <TableCell>{ordem.solicitacao.item.nome}</TableCell>
                    <TableCell>{ordem.informacoesGerais.dataInicio}</TableCell>
                    <TableCell>{ordem.informacoesGerais.dataEntrega}</TableCell>
                    <TableCell>{ordem.informacoesGerais.cliente}</TableCell>
                    <TableCell>{ordem.informacoesGerais.totalCamisetas}</TableCell>
                    <TableCell>{calcularTotalEntregue(ordem)}</TableCell>
                    <TableCell>{totaisPagos[ordem.id]?.quantidade || 0}</TableCell>
                    <TableCell>
                      R$ {(totaisPagos[ordem.id]?.valor || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ordem.informacoesGerais.status}
                        color="success"
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

export default PagamentoOrdens;
