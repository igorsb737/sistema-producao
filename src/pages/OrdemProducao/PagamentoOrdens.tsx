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
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Assessment as AssessmentIcon } from '@mui/icons-material';
import { useSorting } from '../../hooks/useSorting';
import { TableSortableHeader } from '../../components/TableSortableHeader';

function PagamentoOrdens() {
  const navigate = useNavigate();
  const { ordens, loading, error } = useOrdemProducao();
  const { buscarPagamentos, calcularTotalPago, buscarTotaisConciliados, buscarTotaisConciliadosPorTipoServico } = usePagamentos();
  const [totaisPagos, setTotaisPagos] = useState<Record<string, { quantidade: number; valor: number }>>({});
  const [totaisConciliados, setTotaisConciliados] = useState<Record<string, { quantidade: number; valor: number }>>({});
  const [totaisConciliadosServicosEspecificos, setTotaisConciliadosServicosEspecificos] = useState<Record<string, { quantidade: number; valor: number }>>({});
  const [carregandoTotais, setCarregandoTotais] = useState(false);

  // Carrega os pagamentos para cada ordem
  useEffect(() => {
    const carregarDados = async () => {
      if (carregandoTotais) return; // Evita múltiplas chamadas simultâneas
      
      setCarregandoTotais(true);
      const totaisPag: Record<string, { quantidade: number; valor: number }> = {};
      const totaisConc: Record<string, { quantidade: number; valor: number }> = {};
      const totaisConcEspecificos: Record<string, { quantidade: number; valor: number }> = {};
      
      try {
        for (const ordem of ordens) {
          if (ordem.informacoesGerais.status === 'Em Entrega') {
            const pagamentos = await buscarPagamentos(ordem.id);
            totaisPag[ordem.id] = calcularTotalPago(pagamentos);
            
            // Busca totais conciliados usando o método do hook
            totaisConc[ordem.id] = await buscarTotaisConciliados(ordem.id);
            
            // Busca totais conciliados apenas para serviços específicos
            totaisConcEspecificos[ordem.id] = await buscarTotaisConciliadosPorTipoServico(ordem.id);
          }
        }
        
        setTotaisPagos(totaisPag);
        setTotaisConciliados(totaisConc);
        setTotaisConciliadosServicosEspecificos(totaisConcEspecificos);
      } catch (error) {
        console.error('Erro ao carregar totais:', error);
      } finally {
        setCarregandoTotais(false);
      }
    };

    if (ordens.length > 0) {
      carregarDados();
    }
  }, [ordens]); // Removidas as funções da lista de dependências

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

  // Prepara os dados para ordenação com as propriedades corretas
  const ordensParaOrdenacao = ordensDisponiveis.map(ordem => ({
    ...ordem,
    numero: ordem.informacoesGerais.numero,
    item: ordem.solicitacao.item.nome,
    dataInicio: ordem.informacoesGerais.dataInicio,
    dataEntrega: ordem.informacoesGerais.dataEntrega,
    cliente: ordem.informacoesGerais.cliente,
    totalCamisetas: ordem.informacoesGerais.totalCamisetas,
    totalEntregue: calcularTotalEntregue(ordem),
    totalLancado: totaisPagos[ordem.id]?.quantidade || 0,
    valorTotalLancado: totaisPagos[ordem.id]?.valor || 0,
    totalConciliado: totaisConciliadosServicosEspecificos[ordem.id]?.quantidade || 0,
    valorTotalConciliado: totaisConciliados[ordem.id]?.valor || 0,
    status: ordem.informacoesGerais.status
  }));

  const { sortConfigs, requestSort, getSortedItems } = useSorting(ordensParaOrdenacao);

  const handleRowClick = (numero: string) => {
    navigate(`/ordens/pagamento/detalhes?ordem=${numero}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
        <Typography variant="h5">
          Pagamento de Fornecedores
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/ordens/pagamento/relatorio-conciliacoes')}
          >
            Relatório de Conciliações
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/ordens/pagamento/conciliacao')}
          >
            CONCILIAÇÃO
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
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
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
                  label="Total Entregue"
                  field="totalEntregue"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Total Lançado"
                  field="totalLancado"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Valor Total Lançado"
                  field="valorTotalLancado"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Total Conciliado"
                  field="totalConciliado"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Valor Total Conciliado"
                  field="valorTotalConciliado"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
                <TableSortableHeader
                  label="Status"
                  field="status"
                  sortConfigs={sortConfigs}
                  onSort={requestSort}
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {getSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    Nenhuma ordem de produção disponível para pagamento
                  </TableCell>
                </TableRow>
              ) : (
                getSortedItems.map((ordem) => (
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
                    <TableCell>{totaisConciliadosServicosEspecificos[ordem.id]?.quantidade || 0}</TableCell>
                    <TableCell>
                      {totaisConciliados[ordem.id]?.valor ? (
                        <Button
                          variant="text"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ordens/pagamento/conciliacao/detalhes?ordem=${ordem.id}&pagamento=${ordem.id}`);
                          }}
                        >
                          R$ {totaisConciliados[ordem.id].valor.toFixed(2)}
                        </Button>
                      ) : (
                        'R$ 0,00'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ordem.informacoesGerais.status}
                        color="warning"
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
