import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { useBling } from '../../hooks/useBling';
import SyncIcon from '@mui/icons-material/Sync';

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  situacao: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const Registros = () => {
  const { 
    loading, 
    loadingMalha,
    loadingRibana,
    error, 
    sincronizarProdutos, 
    sincronizarMalhas,
    sincronizarRibanas,
    getProdutos, 
    getMalhas,
    getRibanas,
    atualizarToken 
  } = useBling();
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [malhas, setMalhas] = useState<Produto[]>([]);
  const [ribanas, setRibanas] = useState<Produto[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizandoMalha, setSincronizandoMalha] = useState(false);
  const [sincronizandoRibana, setSincronizandoRibana] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const carregarDados = async () => {
    try {
      const [produtosData, malhasData, ribanasData] = await Promise.all([
        getProdutos(),
        getMalhas(),
        getRibanas()
      ]);
      setProdutos(produtosData);
      setMalhas(malhasData);
      setRibanas(ribanasData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const token = await atualizarToken();
      await sincronizarProdutos(token);
      await carregarDados();
    } catch (err) {
      console.error('Erro ao sincronizar produtos:', err);
    } finally {
      setSincronizando(false);
    }
  };

  const handleSincronizarMalha = async () => {
    setSincronizandoMalha(true);
    try {
      const token = await atualizarToken();
      await sincronizarMalhas(token);
      await carregarDados();
    } catch (err) {
      console.error('Erro ao sincronizar malhas:', err);
    } finally {
      setSincronizandoMalha(false);
    }
  };

  const handleSincronizarRibana = async () => {
    setSincronizandoRibana(true);
    try {
      const token = await atualizarToken();
      await sincronizarRibanas(token);
      await carregarDados();
    } catch (err) {
      console.error('Erro ao sincronizar ribanas:', err);
    } finally {
      setSincronizandoRibana(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, mt: 3 }}>Registros</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="registros tabs">
          <Tab label="Produtos" />
          <Tab label="Malha" />
          <Tab label="Ribana" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSincronizar}
            disabled={sincronizando}
          >
            {sincronizando ? 'Sincronizando...' : 'Sincronizar Produtos'}
          </Button>
        </Box>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '15%' }}>ID</TableCell>
                  <TableCell sx={{ width: '15%' }}>Código</TableCell>
                  <TableCell sx={{ width: '55%' }}>Nome</TableCell>
                  <TableCell sx={{ width: '15%' }}>Situação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : produtos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell>{produto.id}</TableCell>
                      <TableCell>{produto.codigo}</TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{produto.situacao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSincronizarMalha}
            disabled={sincronizandoMalha}
          >
            {sincronizandoMalha ? 'Sincronizando...' : 'Sincronizar Malhas'}
          </Button>
        </Box>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '15%' }}>ID</TableCell>
                  <TableCell sx={{ width: '15%' }}>Código</TableCell>
                  <TableCell sx={{ width: '55%' }}>Nome</TableCell>
                  <TableCell sx={{ width: '15%' }}>Situação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingMalha ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : malhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhuma malha encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  malhas.map((malha) => (
                    <TableRow key={malha.id}>
                      <TableCell>{malha.id}</TableCell>
                      <TableCell>{malha.codigo}</TableCell>
                      <TableCell>{malha.nome}</TableCell>
                      <TableCell>{malha.situacao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSincronizarRibana}
            disabled={sincronizandoRibana}
          >
            {sincronizandoRibana ? 'Sincronizando...' : 'Sincronizar Ribanas'}
          </Button>
        </Box>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '15%' }}>ID</TableCell>
                  <TableCell sx={{ width: '15%' }}>Código</TableCell>
                  <TableCell sx={{ width: '55%' }}>Nome</TableCell>
                  <TableCell sx={{ width: '15%' }}>Situação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRibana ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : ribanas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhuma ribana encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  ribanas.map((ribana) => (
                    <TableRow key={ribana.id}>
                      <TableCell>{ribana.id}</TableCell>
                      <TableCell>{ribana.codigo}</TableCell>
                      <TableCell>{ribana.nome}</TableCell>
                      <TableCell>{ribana.situacao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default Registros;
