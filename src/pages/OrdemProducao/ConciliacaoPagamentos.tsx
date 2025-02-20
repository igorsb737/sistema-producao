import { useState, useCallback } from 'react';
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
  Button,
  Checkbox,
  IconButton,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSorting } from '../../hooks/useSorting';
import { TableSortableHeader } from '../../components/TableSortableHeader';

interface LancamentoSelecionado {
  ordemId: string;
  pagamentoId: string;
  lancamentoIndex: number;
  valor: number;
  quantidade: number;
  servicoId: string;
  checked: boolean;
}

interface LancamentoComInfo extends LancamentoSelecionado {
  numero: string;
  item: string;
  tipoServico: string;
  cliente: string;
  dataEntrega: string;
}

function ConciliacaoPagamentos() {
  const navigate = useNavigate();
  const { fornecedores } = useFornecedores();
  const { ordens } = useOrdemProducao();
  const { buscarPagamentosPorFornecedor, criarConciliacao } = usePagamentos();
  const { servicos, getServicoById } = useServicos();

  const [fornecedorId, setFornecedorId] = useState('');
  const [dataPagamento, setDataPagamento] = useState<Date | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoSelecionado[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarLancamentos = useCallback(async (fornecedorIdParam?: string) => {
    const idToUse = fornecedorIdParam || fornecedorId;
    if (!idToUse) {
      setLancamentos([]);
      return;
    }

    setLoading(true);
    try {
      const pagamentos = await buscarPagamentosPorFornecedor(idToUse);
      
      const lancamentosFiltrados = pagamentos.flatMap(({ ordemId, pagamento }) =>
          (pagamento.lancamentos || []).map((lancamento, index) => ({
            ordemId,
            pagamentoId: pagamento.id,
            lancamentoIndex: index,
            valor: Number(lancamento.total) || 0,
            quantidade: Number(lancamento.quantidade) || 0,
            servicoId: lancamento.servicoId,
            checked: false,
          }))
        );

      setLancamentos(lancamentosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [fornecedorId, ordens, buscarPagamentosPorFornecedor]);

  const handleFornecedorChange = async (novoFornecedorId: string) => {
    setFornecedorId(novoFornecedorId);
    if (novoFornecedorId) {
      await carregarLancamentos(novoFornecedorId);
    } else {
      setLancamentos([]);
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
        lancamentosSelecionados.map(({ ordemId, pagamentoId, lancamentoIndex, valor, quantidade, servicoId }) => ({
          ordemId,
          pagamentoId,
          lancamentoIndex,
          valor,
          quantidade,
          servicoId,
        }))
      );

      alert('Conciliação criada com sucesso!');
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

  // Prepara os dados para ordenação com as informações completas
  const lancamentosComInfo: LancamentoComInfo[] = lancamentos.map(lancamento => {
    const ordemInfo = getOrdemInfo(lancamento.ordemId);
    const servico = getServicoById(lancamento.servicoId);
    
    return {
      ...lancamento,
      numero: ordemInfo?.numero || '',
      item: ordemInfo?.item || '',
      tipoServico: servico?.nome || 'N/A',
      cliente: ordemInfo?.cliente || '',
      dataEntrega: ordemInfo?.dataEntrega || '',
    };
  });

  const { sortConfigs, requestSort, getSortedItems } = useSorting(lancamentosComInfo);

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
                <TableSortableHeader
                  label="Número"
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
                  label="Tipo de Serviço"
                  field="tipoServico"
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
                  label="Data Entrega"
                  field="dataEntrega"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Valor"
                  field="valor"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Carregando lançamentos...
                  </TableCell>
                </TableRow>
              ) : getSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {fornecedorId
                      ? "Nenhum lançamento encontrado"
                      : "Selecione um fornecedor para ver os lançamentos"}
                  </TableCell>
                </TableRow>
              ) : (
                getSortedItems.map((lancamento, index) => (
                  <TableRow key={`${lancamento.ordemId}-${lancamento.pagamentoId}-${lancamento.lancamentoIndex}`}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={lancamento.checked}
                        onChange={(e) =>
                          handleCheckLancamento(
                            lancamentos.findIndex(
                              l =>
                                l.ordemId === lancamento.ordemId &&
                                l.pagamentoId === lancamento.pagamentoId &&
                                l.lancamentoIndex === lancamento.lancamentoIndex
                            ),
                            e.target.checked
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{lancamento.numero}</TableCell>
                    <TableCell>{lancamento.item}</TableCell>
                    <TableCell>{lancamento.tipoServico}</TableCell>
                    <TableCell>{lancamento.cliente}</TableCell>
                    <TableCell>{lancamento.dataEntrega}</TableCell>
                    <TableCell align="right">
                      {`R$ ${Number(lancamento.valor).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))
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
