import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useOrdemProducao, OrdemProducao, Lancamento } from '../../hooks/useOrdemProducao';
import { useLancamentoMalha } from '../../hooks/useLancamentoMalha';
import { useLancamentoMalhaSorting } from '../../hooks/useLancamentoMalhaSorting';
import { usePagamentos } from '../../hooks/usePagamentos';

export const LancamentoMalha = () => {
  const [filtroOrdem, setFiltroOrdem] = useState('');
  const [filtroItem, setFiltroItem] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroDataCriacao, setFiltroDataCriacao] = useState('');
  const [malhaUsada, setMalhaUsada] = useState<number>(0);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemProducao | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { ordens, loading: loadingOrdens } = useOrdemProducao();
  const { lancarMalha, loading: loadingLancamento, error } = useLancamentoMalha();
  const { sortConfig, requestSort, getSortedItems } = useLancamentoMalhaSorting();
  const { buscarPagamentos, calcularTotalPago, buscarTotaisConciliados } = usePagamentos();
  const [totaisPagos, setTotaisPagos] = useState<Record<string, { quantidade: number; valor: number }>>({});
  const [totaisConciliados, setTotaisConciliados] = useState<Record<string, { quantidade: number; valor: number }>>({});

  useEffect(() => {
    const carregarDados = async () => {
      const totaisPag: Record<string, { quantidade: number; valor: number }> = {};
      const totaisConc: Record<string, { quantidade: number; valor: number }> = {};
      
      for (const ordem of ordens) {
        if (ordem.informacoesGerais.status !== 'Finalizado') {
          const pagamentos = await buscarPagamentos(ordem.id);
          totaisPag[ordem.id] = calcularTotalPago(pagamentos);
          totaisConc[ordem.id] = await buscarTotaisConciliados(ordem.id);
        }
      }
      
      setTotaisPagos(totaisPag);
      setTotaisConciliados(totaisConc);
    };

    if (ordens.length > 0) {
      carregarDados();
    }
  }, [ordens, buscarPagamentos, calcularTotalPago, buscarTotaisConciliados]);

  const calcularTotalRecebimentos = (ordem: OrdemProducao | null) => {
    if (!ordem || !ordem.grades) return 0;
    return Object.values(ordem.grades).reduce((total, grade) => {
      if (!grade.recebimentos) return total;
      return total + grade.recebimentos.reduce((sum, recebimento) => sum + recebimento.quantidade, 0);
    }, 0);
  };

  const calcularTotalLancamentos = (ordem: OrdemProducao | null) => {
    if (!ordem) return 0;
    return totaisPagos[ordem.id]?.quantidade || 0;
  };

  const calcularTotalConciliados = (ordem: OrdemProducao | null) => {
    if (!ordem) return 0;
    return totaisConciliados[ordem.id]?.quantidade || 0;
  };

  const validarTotais = (ordem: OrdemProducao | null) => {
    if (!ordem) return false;
    const totalRecebimentos = calcularTotalRecebimentos(ordem);
    const totalLancamentos = calcularTotalLancamentos(ordem);
    const totalConciliados = calcularTotalConciliados(ordem);

    // Validar apenas os totais relevantes
    return totalRecebimentos > 0 && 
           totalLancamentos > 0 && 
           totalConciliados > 0 &&
           totalRecebimentos === totalLancamentos && 
           totalLancamentos === totalConciliados;
  };

  const ordensFiltradas = ordens
    .filter((ordem) => {
      const matchOrdem = ordem.informacoesGerais.numero.toLowerCase().includes(filtroOrdem.toLowerCase());
      const matchItem = ordem.solicitacao.item.nome.toLowerCase().includes(filtroItem.toLowerCase());
      const matchCliente = ordem.informacoesGerais.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
      const matchData = ordem.informacoesGerais.dataInicio.includes(filtroDataCriacao);
      const statusValido = ordem.informacoesGerais.status !== 'Finalizado';

      return matchOrdem && matchItem && matchCliente && matchData && statusValido;
    });

  const ordensSortedAndFiltered = getSortedItems(ordensFiltradas);

  const handleLancarMalha = async () => {
    if (!ordemSelecionada || malhaUsada <= 0) return;

    const totalRecebimentos = calcularTotalRecebimentos(ordemSelecionada);
    const totalLancamentos = calcularTotalLancamentos(ordemSelecionada);
    const totalConciliados = calcularTotalConciliados(ordemSelecionada);
    
    if (!validarTotais(ordemSelecionada)) {
      alert(`Não é possível lançar malha.
Total Entregue: ${totalRecebimentos}
Total Lançado: ${totalLancamentos}
Total Conciliado: ${totalConciliados}
Os totais de camisetas entregues, lançadas e conciliadas devem ser iguais.`);
      return;
    }

    try {
      await lancarMalha(ordemSelecionada.id, malhaUsada, totalRecebimentos);
      setOrdemSelecionada(null);
      setMalhaUsada(0);
      setConfirmDialogOpen(false);
    } catch (err) {
      console.error('Erro ao lançar malha:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Lançamento de Malha
      </Typography>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ordem"
                value={filtroOrdem}
                onChange={(e) => setFiltroOrdem(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Item"
                value={filtroItem}
                onChange={(e) => setFiltroItem(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Cliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Data de Criação"
                type="date"
                value={filtroDataCriacao}
                onChange={(e) => setFiltroDataCriacao(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => requestSort('ordem')}>Ordem</TableCell>
              <TableCell onClick={() => requestSort('item')}>Item</TableCell>
              <TableCell onClick={() => requestSort('dataCriacao')}>Data de Criação</TableCell>
              <TableCell onClick={() => requestSort('cliente')}>Cliente</TableCell>
              <TableCell>Malha Prevista</TableCell>
              <TableCell>Total Camisetas Previstas</TableCell>
              <TableCell>Total Camisetas Entregue</TableCell>
              <TableCell>Total Lançamentos</TableCell>
              <TableCell>Total Conciliados</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordensSortedAndFiltered.map((ordem) => {
              const totalRecebimentos = calcularTotalRecebimentos(ordem);
              const totalLancamentos = calcularTotalLancamentos(ordem);
              const totalConciliados = calcularTotalConciliados(ordem);
              return (
                <TableRow key={ordem.id}>
                  <TableCell>{ordem.informacoesGerais.numero}</TableCell>
                  <TableCell>{ordem.solicitacao.item.nome}</TableCell>
                  <TableCell>{ordem.informacoesGerais.dataInicio}</TableCell>
                  <TableCell>{ordem.informacoesGerais.cliente}</TableCell>
                  <TableCell>{ordem.solicitacao.previsoes.malha}</TableCell>
                  <TableCell>{ordem.informacoesGerais.totalCamisetas}</TableCell>
                  <TableCell>{totalRecebimentos}</TableCell>
                  <TableCell>
                    {totalLancamentos} ({totaisPagos[ordem.id]?.valor ? `R$ ${totaisPagos[ordem.id].valor.toFixed(2)}` : 'R$ 0,00'})
                  </TableCell>
                  <TableCell>
                    {totalConciliados} ({totaisConciliados[ordem.id]?.valor ? `R$ ${totaisConciliados[ordem.id].valor.toFixed(2)}` : 'R$ 0,00'})
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        setOrdemSelecionada(ordem);
                        setConfirmDialogOpen(true);
                      }}
                      disabled={!validarTotais(ordem)}
                    >
                      Lançar Malha
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Lançar Malha</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Ordem: {ordemSelecionada?.informacoesGerais.numero}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Item: {ordemSelecionada?.solicitacao.item.nome}
            </Typography>
            <Typography variant="body1" gutterBottom color="error">
              Atenção: Após o lançamento, a ordem será finalizada e não poderá mais ser modificada.
            </Typography>
            {!validarTotais(ordemSelecionada) && (
              <Box sx={{ mt: 2 }}>
                <Typography color="error" gutterBottom>
                  Os totais de camisetas entregues, lançadas e conciliadas devem ser iguais para finalizar a ordem.
                </Typography>
                <Typography variant="body2">
                  Total Entregue: {calcularTotalRecebimentos(ordemSelecionada)}
                </Typography>
                <Typography variant="body2">
                  Total Lançado: {calcularTotalLancamentos(ordemSelecionada)} 
                  ({ordemSelecionada && totaisPagos[ordemSelecionada.id]?.valor 
                    ? `R$ ${totaisPagos[ordemSelecionada.id].valor.toFixed(2)}` 
                    : 'R$ 0,00'})
                </Typography>
                <Typography variant="body2">
                  Total Conciliado: {calcularTotalConciliados(ordemSelecionada)}
                  ({ordemSelecionada && totaisConciliados[ordemSelecionada.id]?.valor 
                    ? `R$ ${totaisConciliados[ordemSelecionada.id].valor.toFixed(2)}` 
                    : 'R$ 0,00'})
                </Typography>
              </Box>
            )}
            <TextField
              fullWidth
              label="Quantidade de Malha Usada (kg)"
              type="number"
              value={malhaUsada}
              onChange={(e) => setMalhaUsada(Number(e.target.value))}
              sx={{ mt: 2 }}
            />
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleLancarMalha}
            variant="contained"
            color="primary"
            disabled={loadingLancamento || malhaUsada <= 0}
          >
            {loadingLancamento ? 'Lançando...' : 'Confirmar e Finalizar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
