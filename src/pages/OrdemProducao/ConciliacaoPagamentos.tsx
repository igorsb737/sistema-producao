import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagamentos } from '../../hooks/usePagamentos';
import { useFornecedores } from '../../hooks/useFornecedores';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
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
  Button,
  Checkbox,
  IconButton,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse, isValid } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import RefreshIcon from '@mui/icons-material/Refresh';

interface LancamentoSelecionado {
  ordemId: string;
  pagamentoId: string;
  lancamentoIndex: number;
  valor: number;
  checked: boolean;
}

function ConciliacaoPagamentos() {
  const navigate = useNavigate();
  const { fornecedores } = useFornecedores();
  const { ordens } = useOrdemProducao();
  const { buscarPagamentosPorFornecedor, criarConciliacao } = usePagamentos();

  const [fornecedorId, setFornecedorId] = useState('');
  const [dataEntrega, setDataEntrega] = useState<Date | null>(null);
  const [dataPagamento, setDataPagamento] = useState<Date | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoSelecionado[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarLancamentos = useCallback(async () => {
    if (!fornecedorId) {
      setLancamentos([]);
      return;
    }

    setLoading(true);
    try {
      const pagamentos = await buscarPagamentosPorFornecedor(fornecedorId);
      
      const lancamentosFiltrados = pagamentos
        .filter(({ ordemId }) => {
          if (!dataEntrega || !isValid(dataEntrega)) return true;
          const ordem = ordens.find(o => o.id === ordemId);
          if (!ordem?.informacoesGerais?.dataEntrega) return false;
          
          try {
            const dataEntregaOrdem = parse(
              ordem.informacoesGerais.dataEntrega,
              'dd-MM-yyyy',
              new Date()
            );
            return isValid(dataEntregaOrdem) && 
                   dataEntregaOrdem.getTime() === dataEntrega.getTime();
          } catch {
            return false;
          }
        })
        .flatMap(({ ordemId, pagamento }) =>
          (pagamento.lancamentos || []).map((lancamento, index) => ({
            ordemId,
            pagamentoId: pagamento.id,
            lancamentoIndex: index,
            valor: Number(lancamento.total) || 0,
            checked: false,
          }))
        );

      setLancamentos(lancamentosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [fornecedorId, dataEntrega, ordens, buscarPagamentosPorFornecedor]);

  const handleFornecedorChange = async (novoFornecedorId: string) => {
    setFornecedorId(novoFornecedorId);
    if (novoFornecedorId) {
      await carregarLancamentos();
    } else {
      setLancamentos([]);
    }
  };

  const handleDataEntregaChange = async (novaData: Date | null) => {
    setDataEntrega(novaData);
    if (fornecedorId) {
      await carregarLancamentos();
    }
  };

  const handleCheckLancamento = (index: number, checked: boolean) => {
    setLancamentos(prev =>
      prev.map((l, i) => (i === index ? { ...l, checked } : l))
    );
  };

  const handleConciliar = async () => {
    if (!fornecedorId || !dataPagamento) {
      alert('Selecione o fornecedor e a data de pagamento');
      return;
    }

    const lancamentosSelecionados = lancamentos.filter(l => l.checked);
    if (lancamentosSelecionados.length === 0) {
      alert('Selecione pelo menos um lançamento para conciliar');
      return;
    }

    try {
      await criarConciliacao(
        fornecedorId,
        format(dataPagamento, 'dd-MM-yyyy'),
        lancamentosSelecionados.map(({ ordemId, pagamentoId, lancamentoIndex, valor }) => ({
          ordemId,
          pagamentoId,
          lancamentoIndex,
          valor,
        }))
      );

      navigate('/ordens/pagamento');
    } catch (error) {
      console.error('Erro ao criar conciliação:', error);
      alert('Erro ao criar conciliação. Tente novamente.');
    }
  };

  const getOrdemInfo = useCallback((ordemId: string) => {
    const ordem = ordens.find(o => o.id === ordemId);
    if (!ordem?.informacoesGerais) return null;
    
    return {
      numero: ordem.informacoesGerais.numero || '',
      cliente: ordem.informacoesGerais.cliente || '',
      item: ordem.solicitacao?.item?.nome || '',
      dataEntrega: ordem.informacoesGerais.dataEntrega || '',
    };
  }, [ordens]);

  const totalSelecionado = lancamentos
    .filter(l => l.checked)
    .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
          <Typography variant="h5">Conciliação de Pagamentos</Typography>
          <Box>
            <Button
              variant="outlined"
              onClick={() => navigate('/ordens/pagamento')}
              sx={{ mr: 2 }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={handleConciliar}
              disabled={!fornecedorId || !dataPagamento || lancamentos.filter(l => l.checked).length === 0}
            >
              Conciliar Selecionados
            </Button>
          </Box>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Fornecedor</InputLabel>
              <Select
                value={fornecedorId}
                onChange={(e) => handleFornecedorChange(e.target.value)}
                label="Fornecedor"
              >
                <MenuItem value="">
                  <em>Selecione um fornecedor</em>
                </MenuItem>
                {fornecedores
                  .filter((f) => f.situacao === 'A')
                  .map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Data de Entrega"
              value={dataEntrega}
              onChange={handleDataEntregaChange}
              format="dd/MM/yyyy"
              disabled={!fornecedorId}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 200 }
                }
              }}
            />

            <DatePicker
              label="Data de Pagamento"
              value={dataPagamento}
              onChange={setDataPagamento}
              format="dd/MM/yyyy"
              disabled={!fornecedorId}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 200 }
                }
              }}
            />

            <IconButton 
              onClick={() => carregarLancamentos()} 
              disabled={!fornecedorId || loading}
              color="primary"
              title="Atualizar lançamentos"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Lista de Lançamentos */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    disabled={!fornecedorId || lancamentos.length === 0}
                    checked={
                      lancamentos.length > 0 &&
                      lancamentos.every((l) => l.checked)
                    }
                    indeterminate={
                      lancamentos.some((l) => l.checked) &&
                      !lancamentos.every((l) => l.checked)
                    }
                    onChange={(e) =>
                      setLancamentos((prev) =>
                        prev.map((l) => ({ ...l, checked: e.target.checked }))
                      )
                    }
                  />
                </TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Data Entrega</TableCell>
                <TableCell align="right">Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Carregando lançamentos...
                  </TableCell>
                </TableRow>
              ) : lancamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {fornecedorId
                      ? "Nenhum lançamento encontrado"
                      : "Selecione um fornecedor para ver os lançamentos"}
                  </TableCell>
                </TableRow>
              ) : (
                lancamentos.map((lancamento, index) => {
                  const ordemInfo = getOrdemInfo(lancamento.ordemId);
                  if (!ordemInfo) return null;

                  return (
                    <TableRow key={`${lancamento.ordemId}-${lancamento.pagamentoId}-${lancamento.lancamentoIndex}`}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={lancamento.checked}
                          onChange={(e) =>
                            handleCheckLancamento(index, e.target.checked)
                          }
                        />
                      </TableCell>
                      <TableCell>{ordemInfo.numero}</TableCell>
                      <TableCell>{ordemInfo.item}</TableCell>
                      <TableCell>{ordemInfo.cliente}</TableCell>
                      <TableCell>{ordemInfo.dataEntrega}</TableCell>
                      <TableCell align="right">
                        {`R$ ${Number(lancamento.valor).toFixed(2)}`}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total */}
        {lancamentos.some(l => l.checked) && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" align="right">
              Total Selecionado: R$ {totalSelecionado.toFixed(2)}
            </Typography>
          </Paper>
        )}
      </Box>
    </LocalizationProvider>
  );
}

export default ConciliacaoPagamentos;
