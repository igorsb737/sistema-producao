import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagamentos } from '../../hooks/usePagamentos';
import { useFornecedores } from '../../hooks/useFornecedores';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { format } from 'date-fns';
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
} from '@mui/material';
import { Assessment as AssessmentIcon } from '@mui/icons-material';

interface Filtros {
  fornecedorId: string;
  servicoId: string;
  dataPagamento: string;
}

interface Conciliacao {
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
}

function RelatorioConciliacoes() {
  const navigate = useNavigate();
  const { fornecedores } = useFornecedores();
  const { ordens } = useOrdemProducao();
  const { buscarPagamentos } = usePagamentos();
  
  const [filtros, setFiltros] = useState<Filtros>({
    fornecedorId: '',
    servicoId: '',
    dataPagamento: '',
  });
  
  const { servicos, getServicoById } = useServicos();
  
  const [conciliacoes, setConciliacoes] = useState<Conciliacao[]>([]);
  const [loading, setLoading] = useState(false);

  const buscarConciliacoes = async () => {
    setLoading(true);
    try {
      const conciliacoesTemp: Conciliacao[] = [];
      
      // Busca todas as ordens com pagamentos
      for (const ordem of ordens) {
        const pagamentos = await buscarPagamentos(ordem.id);
        
        // Filtra pagamentos com conciliação
        const pagamentosConciliados = pagamentos.filter(p => p.conciliacao);
        
        for (const pagamento of pagamentosConciliados) {
          // Aplica filtros
          const lancamentosFiltrados = pagamento.lancamentos.filter(l => {
            const matchFornecedor = !filtros.fornecedorId || l.fornecedorId === filtros.fornecedorId;
            const matchServico = !filtros.servicoId || l.servicoId === filtros.servicoId;
            const matchData = !filtros.dataPagamento || 
              pagamento.conciliacao?.dataPagamento.includes(filtros.dataPagamento);
            
            return matchFornecedor && matchServico && matchData;
          });

          if (lancamentosFiltrados.length > 0) {
            for (const lancamento of lancamentosFiltrados) {
              // Encontra o lançamento selecionado correspondente na conciliação
              const lancamentoConciliado = pagamento.conciliacao?.lancamentosSelecionados.find(
                l => l.index === lancamentosFiltrados.indexOf(lancamento)
              );
              
              const servico = getServicoById(lancamentoConciliado?.servicoId || lancamento.servicoId);
              const fornecedor = fornecedores.find(f => f.id === lancamento.fornecedorId);
              
              conciliacoesTemp.push({
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
              });
            }
          }
        }
      }
      
      setConciliacoes(conciliacoesTemp);
    } catch (error) {
      console.error('Erro ao buscar conciliações:', error);
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

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon /> Relatório de Conciliações
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
        >
          Voltar
        </Button>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
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
                  .map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
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
          
          <Grid item xs={12} md={3}>
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
              <TableCell>Ordem de Produção</TableCell>
              <TableCell>Data Conciliação</TableCell>
              <TableCell>Data Pagamento</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Status Pedido</TableCell>
              <TableCell>Serviço</TableCell>
              <TableCell align="right">Qtd. Conciliada</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status Conciliação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography>Carregando...</Typography>
                </TableCell>
              </TableRow>
            ) : conciliacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography>Nenhuma conciliação encontrada</Typography>
                </TableCell>
              </TableRow>
            ) : (
              conciliacoes.map((conciliacao, index) => (
                <TableRow key={`${conciliacao.ordemId}-${index}`}>
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
    </Box>
  );
}

export default RelatorioConciliacoes;
