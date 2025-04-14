import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { usePagamentos } from '../../hooks/usePagamentos';
import { useFornecedores } from '../../hooks/useFornecedores';
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
  Button,
  Chip,
  Grid,
} from '@mui/material';

function ConciliacaoDetalhes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ordens } = useOrdemProducao();
  const { fornecedores } = useFornecedores();
  const { buscarPagamentos, atualizarStatusConciliacao } = usePagamentos();
  const [pagamento, setPagamento] = useState<any>(null);
  const [ordem, setOrdem] = useState<any>(null);

  useEffect(() => {
    const carregarDados = async () => {
      const ordemId = searchParams.get('ordem');
      const pagamentoId = searchParams.get('pagamento');

      if (!ordemId || !pagamentoId || !ordens.length) return;

      const ordemEncontrada = ordens.find(o => o.id === ordemId);
      if (!ordemEncontrada) return;

      setOrdem(ordemEncontrada);

      const pagamentos = await buscarPagamentos(ordemId);
      const pagamentoEncontrado = pagamentos.find(p => p.id === pagamentoId);
      if (pagamentoEncontrado) {
        setPagamento(pagamentoEncontrado);
      }
    };

    carregarDados();
  }, [searchParams, ordens]);

  const handleAtualizarStatus = async (novoStatus: 'Pendente' | 'Enviado' | 'Pago') => {
    if (!ordem || !pagamento) return;

    try {
      // Corrigir: buscar o índice do lançamento conciliado
      // Aqui assumo que só há um lançamento conciliado por vez nesta tela
      const lancamentoIndex = pagamento.lancamentos?.findIndex(
        (l: any) => l.conciliacao && l.conciliacao.status === pagamento.conciliacao.status
      ) ?? 0;
      await atualizarStatusConciliacao(ordem.id, pagamento.id, lancamentoIndex, novoStatus);
      navigate('/ordens/pagamento');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status da conciliação');
    }
  };

  if (!ordem || !pagamento || !pagamento.conciliacao) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Conciliação não encontrada</Typography>
      </Box>
    );
  }

  const fornecedor = fornecedores.find(f => f.id === pagamento.lancamentos[0]?.fornecedorId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
        <Typography variant="h5">Detalhes da Conciliação</Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/ordens/pagamento')}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
          {pagamento.conciliacao.status === 'Pendente' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAtualizarStatus('Enviado')}
              sx={{ mr: 1 }}
            >
              Marcar como Enviado
            </Button>
          )}
          {pagamento.conciliacao.status === 'Enviado' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleAtualizarStatus('Pago')}
            >
              Marcar como Pago
            </Button>
          )}
        </Box>
      </Box>

      {/* Informações da Conciliação */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Fornecedor
            </Typography>
            <Typography variant="body1">{fornecedor?.nome || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Data de Pagamento
            </Typography>
            <Typography variant="body1">{pagamento.conciliacao.dataPagamento}</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Data da Conciliação
            </Typography>
            <Typography variant="body1">{pagamento.conciliacao.dataConciliacao}</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={pagamento.conciliacao.status}
              color={
                pagamento.conciliacao.status === 'Pago'
                  ? 'success'
                  : pagamento.conciliacao.status === 'Enviado'
                  ? 'primary'
                  : 'default'
              }
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Lançamentos Conciliados */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Lançamentos Conciliados</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Índice</TableCell>
                <TableCell align="right">Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagamento.conciliacao.lancamentosSelecionados.map((lancamento: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{lancamento.index}</TableCell>
                  <TableCell align="right">R$ {lancamento.valor.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  R$ {pagamento.conciliacao.total.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default ConciliacaoDetalhes;
