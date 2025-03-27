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
  MenuItem,
  Chip,
  Divider,
} from '@mui/material';
import {
  ref,
  get,
} from 'firebase/database';
import { database } from '../../config/firebase';
import { useOrdemProducao, OrdemProducao } from '../../hooks/useOrdemProducao';
import { useLancamentoMalha } from '../../hooks/useLancamentoMalha';
import { useSorting } from '../../hooks/useSorting';
import { TableSortableHeader } from '../../components/TableSortableHeader';
import { usePagamentos } from '../../hooks/usePagamentos';
import { useBling } from '../../hooks/useBling';

export const LancamentoMalha = () => {
  const [filtroOrdem, setFiltroOrdem] = useState('');
  const [filtroItem, setFiltroItem] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroDataCriacao, setFiltroDataCriacao] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [malhaUsada, setMalhaUsada] = useState<number | undefined>(undefined);
  const [ribanaUsada, setRibanaUsada] = useState<number | undefined>(undefined);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemProducao | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rendimentoAtual, setRendimentoAtual] = useState<number | null>(null);
  const [malhaInfo, setMalhaInfo] = useState<{ id: string; nome: string } | null>(null);
  const [ribanaInfo, setRibanaInfo] = useState<{ id: string; nome: string } | null>(null);

  const { ordens, recarregarOrdens } = useOrdemProducao();
  const { lancarMalha, loading: loadingLancamento, error } = useLancamentoMalha();
  const { buscarPagamentos, calcularTotalPago, buscarTotaisConciliados } = usePagamentos();
  const { registrarSaidaEstoque } = useBling();
  const [totaisPagos, setTotaisPagos] = useState<Record<string, { quantidade: number; valor: number }>>({});
  const [totaisConciliados, setTotaisConciliados] = useState<Record<string, { quantidade: number; valor: number }>>({});

  useEffect(() => {
    const carregarDados = async () => {
      const totaisPag: Record<string, { quantidade: number; valor: number }> = {};
      const totaisConc: Record<string, { quantidade: number; valor: number }> = {};
      
      for (const ordem of ordens) {
        const pagamentos = await buscarPagamentos(ordem.id);
        totaisPag[ordem.id] = calcularTotalPago(pagamentos);
        totaisConc[ordem.id] = await buscarTotaisConciliados(ordem.id);
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
      const matchStatus = !filtroStatus || ordem.informacoesGerais.status === filtroStatus;
      const statusValido = ordem.informacoesGerais.status === 'Em Entrega' || ordem.informacoesGerais.status === 'Finalizado';

      return matchOrdem && matchItem && matchCliente && matchData && matchStatus && statusValido;
    });

  // Prepara os dados para ordenação com as propriedades corretas
  const ordensParaOrdenacao = ordensFiltradas.map(ordem => ({
    ...ordem,
    ordem: ordem.informacoesGerais.numero,
    item: ordem.solicitacao.item.nome,
    dataCriacao: ordem.informacoesGerais.dataInicio,
    cliente: ordem.informacoesGerais.cliente,
    malhaPrevista: ordem.solicitacao.previsoes.malha,
    totalCamisetasPrevistas: ordem.informacoesGerais.totalCamisetas,
    totalCamisetasEntregue: calcularTotalRecebimentos(ordem),
    totalLancamentos: calcularTotalLancamentos(ordem),
    totalConciliados: calcularTotalConciliados(ordem),
    status: ordem.informacoesGerais.status
  }));

  const { sortConfigs, requestSort, getSortedItems } = useSorting(ordensParaOrdenacao);

  const calcularRendimentoAtual = (malha: number | undefined) => {
    if (!ordemSelecionada || !malha || malha <= 0) {
      setRendimentoAtual(null);
      return;
    }
    const totalRecebimentos = calcularTotalRecebimentos(ordemSelecionada);
    const rendimento = totalRecebimentos / malha;
    setRendimentoAtual(rendimento);
  };

  const handleLancarMalhaEFinalizar = async () => {
    if (!ordemSelecionada || !malhaUsada || !ribanaUsada || malhaUsada <= 0 || ribanaUsada <= 0) return;

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
      // Buscar IDs dos produtos no Firebase
      const malhasRef = ref(database, 'malhas');
      const ribanasRef = ref(database, 'ribanas');
      
      const malhasSnapshot = await get(malhasRef);
      const ribanasSnapshot = await get(ribanasRef);
      
      if (!malhasSnapshot.exists() || !ribanasSnapshot.exists()) {
        throw new Error('Dados de malhas ou ribanas não encontrados');
      }
      
      // Obter os IDs dos produtos
      // Verificar se temos os IDs corretos
      if (!malhaInfo?.id || !ribanaInfo?.id) {
        console.error('IDs não encontrados nos estados:', { malhaInfo, ribanaInfo });
        
        // Tentar buscar novamente os IDs diretamente
        let malhaId = '';
        let ribanaId = '';
        
        // Buscar malha pelo nome
        const malhasData = malhasSnapshot.val();
        for (const [_, malha] of Object.entries(malhasData)) {
          if ((malha as any).nome === ordemSelecionada.solicitacao.malha.nome) {
            malhaId = (malha as any).id;
            console.log('ID da malha encontrado diretamente:', malhaId);
            break;
          }
        }
        
        // Buscar ribana pelo nome
        const ribanasData = ribanasSnapshot.val();
        for (const [_, ribana] of Object.entries(ribanasData)) {
          if ((ribana as any).nome === ordemSelecionada.solicitacao.ribana.nome) {
            ribanaId = (ribana as any).id;
            console.log('ID da ribana encontrado diretamente:', ribanaId);
            break;
          }
        }
        
        if (!malhaId || !ribanaId) {
          throw new Error('Não foi possível encontrar os IDs dos produtos no Firebase');
        }
        
        // Calcular o rendimento
        const rendimento = totalRecebimentos / malhaUsada;
        
        // Formatar a observação para o Bling
        const observacao = `OP ${ordemSelecionada.informacoesGerais.numero} - Qtd: ${totalRecebimentos} - Rendimento: ${rendimento.toFixed(2)}`;
        
        console.log('Enviando para o Bling - Malha:', { id: malhaId, quantidade: malhaUsada });
        console.log('Enviando para o Bling - Ribana:', { id: ribanaId, quantidade: ribanaUsada });
        
        // Lançar saída de malha no Bling
        const malhaLancada = await registrarSaidaEstoque(
          malhaId,
          malhaUsada,
          observacao
        );
        
        // Lançar saída de ribana no Bling
        const ribanaLancada = await registrarSaidaEstoque(
          ribanaId,
          ribanaUsada,
          observacao
        );
        
        // Se ambos os lançamentos no Bling forem bem-sucedidos, lançar no Firebase e finalizar a ordem
        if (malhaLancada && ribanaLancada) {
          await lancarMalha(ordemSelecionada.id, malhaUsada, ribanaUsada, totalRecebimentos);
          await recarregarOrdens();
          setOrdemSelecionada(null);
          setMalhaUsada(undefined);
          setRibanaUsada(undefined);
          setConfirmDialogOpen(false);
          setRendimentoAtual(null);
        } else {
          throw new Error('Falha ao lançar estoque no Bling');
        }
      } else {
        // Usar os IDs dos estados
        const malhaId = malhaInfo.id;
        const ribanaId = ribanaInfo.id;
        
        // Calcular o rendimento
        const rendimento = totalRecebimentos / malhaUsada;
        
        // Formatar a observação para o Bling
        const observacao = `OP ${ordemSelecionada.informacoesGerais.numero} - Qtd: ${totalRecebimentos} - Rendimento: ${rendimento.toFixed(2)}`;
        
        console.log('Enviando para o Bling - Malha:', { id: malhaId, quantidade: malhaUsada });
        console.log('Enviando para o Bling - Ribana:', { id: ribanaId, quantidade: ribanaUsada });
        
        // Lançar saída de malha no Bling
        const malhaLancada = await registrarSaidaEstoque(
          malhaId,
          malhaUsada,
          observacao
        );
        
        // Lançar saída de ribana no Bling
        const ribanaLancada = await registrarSaidaEstoque(
          ribanaId,
          ribanaUsada,
          observacao
        );
        
        // Se ambos os lançamentos no Bling forem bem-sucedidos, lançar no Firebase e finalizar a ordem
        if (malhaLancada && ribanaLancada) {
          await lancarMalha(ordemSelecionada.id, malhaUsada, ribanaUsada, totalRecebimentos);
          await recarregarOrdens();
          setOrdemSelecionada(null);
          setMalhaUsada(undefined);
          setRibanaUsada(undefined);
          setConfirmDialogOpen(false);
          setRendimentoAtual(null);
        } else {
          throw new Error('Falha ao lançar estoque no Bling');
        }
      }
    } catch (err) {
      console.error('Erro ao lançar malha:', err);
      alert(`Erro ao lançar malha: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  useEffect(() => {
    const buscarInfoProdutos = async () => {
      if (!ordemSelecionada) {
        setMalhaInfo(null);
        setRibanaInfo(null);
        return;
      }
      
      try {
        // Buscar informações da malha e ribana
        const malhasRef = ref(database, 'malhas');
        const ribanasRef = ref(database, 'ribanas');
        
        const [malhasSnapshot, ribanasSnapshot] = await Promise.all([
          get(malhasRef),
          get(ribanasRef)
        ]);
        
        let malhaEncontrada = null;
        let ribanaEncontrada = null;
        let malhaKey = '';
        let ribanaKey = '';
        
        if (malhasSnapshot.exists()) {
          const malhasData = malhasSnapshot.val();
          // Buscar pelo nome da malha na ordem
          const malhaNome = ordemSelecionada.solicitacao.malha.nome;
          
          for (const [key, malha] of Object.entries(malhasData)) {
            if ((malha as any).nome === malhaNome) {
              malhaEncontrada = { key, ...malha as any };
              malhaKey = key;
              break;
            }
          }
          
          if (malhaEncontrada) {
            setMalhaInfo({
              id: malhaEncontrada.id || malhaKey, // Usar o ID interno ou a chave como fallback
              nome: malhaEncontrada.nome
            });
          } else {
            console.warn('Malha não encontrada pelo nome:', malhaNome);
          }
        }
        
        if (ribanasSnapshot.exists()) {
          const ribanasData = ribanasSnapshot.val();
          // Buscar pelo nome da ribana na ordem
          const ribanaNome = ordemSelecionada.solicitacao.ribana.nome;
          
          for (const [key, ribana] of Object.entries(ribanasData)) {
            if ((ribana as any).nome === ribanaNome) {
              ribanaEncontrada = { key, ...ribana as any };
              ribanaKey = key;
              break;
            }
          }
          
          if (ribanaEncontrada) {
            setRibanaInfo({
              id: ribanaEncontrada.id || ribanaKey, // Usar o ID interno ou a chave como fallback
              nome: ribanaEncontrada.nome
            });
          } else {
            console.warn('Ribana não encontrada pelo nome:', ribanaNome);
          }
        }
        
        // Log para debug
        console.log('Malha encontrada:', malhaEncontrada);
        console.log('Ribana encontrada:', ribanaEncontrada);
        
      } catch (err) {
        console.error('Erro ao buscar informações dos produtos:', err);
        setMalhaInfo(null);
        setRibanaInfo(null);
      }
    };
    
    buscarInfoProdutos();
  }, [ordemSelecionada]);

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
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Cliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Data de Criação"
                type="date"
                value={filtroDataCriacao}
                onChange={(e) => setFiltroDataCriacao(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="Em Entrega">Em Entrega</MenuItem>
                <MenuItem value="Finalizado">Finalizado</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableSortableHeader
                label="Ordem"
                field="ordem"
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
                label="Data de Criação"
                field="dataCriacao"
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
                label="Malha Prevista"
                field="malhaPrevista"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Total Camisetas Previstas"
                field="totalCamisetasPrevistas"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Total Camisetas Entregue"
                field="totalCamisetasEntregue"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Total Lançamentos"
                field="totalLancamentos"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Total Conciliados"
                field="totalConciliados"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableSortableHeader
                label="Status"
                field="status"
                sortConfigs={sortConfigs}
                onSort={requestSort}
              />
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedItems.map((ordem) => {
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
                  <TableCell>{totalLancamentos}</TableCell>
                  <TableCell>{totalConciliados}</TableCell>
                  <TableCell>
                    <Chip
                      label={ordem.informacoesGerais.status}
                      color={ordem.informacoesGerais.status === 'Em Entrega' ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        setOrdemSelecionada(ordem);
                        setConfirmDialogOpen(true);
                        setRendimentoAtual(null);
                      }}
                      disabled={!validarTotais(ordem) || !!ordem.lancamentoMalha}
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
            
            {/* Informações da Malha e Ribana */}
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Materiais que serão retirados do estoque:
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Malha:
                </Typography>
                <Typography variant="body1">
                  {malhaInfo?.nome || ordemSelecionada?.solicitacao.malha.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {malhaInfo?.id || "Não encontrado"}
                </Typography>
              </Box>
              
              <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Ribana:
                </Typography>
                <Typography variant="body1">
                  {ribanaInfo?.nome || ordemSelecionada?.solicitacao.ribana.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {ribanaInfo?.id || "Não encontrado"}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body1" gutterBottom>
              Total de Camisetas Entregue: {calcularTotalRecebimentos(ordemSelecionada)}
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
                </Typography>
                <Typography variant="body2">
                  Total Conciliado: {calcularTotalConciliados(ordemSelecionada)}
                </Typography>
              </Box>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantidade de Malha Usada (kg)"
                  type="number"
                  value={malhaUsada || ''}
                  onChange={(e) => {
                    const valor = e.target.value ? Number(e.target.value) : undefined;
                    setMalhaUsada(valor);
                    calcularRendimentoAtual(valor);
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantidade de Ribana Usada (kg)"
                  type="number"
                  value={ribanaUsada || ''}
                  onChange={(e) => setRibanaUsada(e.target.value ? Number(e.target.value) : undefined)}
                />
              </Grid>
            </Grid>
            {rendimentoAtual !== null && (
              <Grid item xs={12}>
                <Typography variant="body1" color="primary">
                  Rendimento Atual: {rendimentoAtual.toFixed(2)} peças/kg
                </Typography>
                {malhaUsada && ribanaUsada && (
                  <Typography variant="body1" color="primary" sx={{ mt: 1 }}>
                    Porcentagem de Ribana: {((ribanaUsada / malhaUsada) * 100).toFixed(1)}%
                  </Typography>
                )}
              </Grid>
            )}
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setConfirmDialogOpen(false);
            setRendimentoAtual(null);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={handleLancarMalhaEFinalizar}
            variant="contained"
            color="primary"
            disabled={loadingLancamento || !malhaUsada || !ribanaUsada || malhaUsada <= 0 || ribanaUsada <= 0}
          >
            {loadingLancamento ? 'Finalizando...' : 'Lançar Malha e Finalizar Pedido'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
