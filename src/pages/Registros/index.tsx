import { useEffect, useState } from 'react';
import { useFornecedores } from '../../hooks/useFornecedores';
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
  idProdutoPai?: string;
}

interface Fornecedor {
  id: string;
  nome: string;
  codigo: string;
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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const Registros = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const { 
    loading, 
    loadingMalha,
    loadingRibana,
    loadingServico,
    loadingFornecedor,
    error, 
    sincronizarProdutos, 
    sincronizarMalhas,
    sincronizarRibanas,
    sincronizarServicos,
    sincronizarFornecedores,
    getProdutos, 
    getMalhas,
    getRibanas,
    getServicos,
    getFornecedores,
    atualizarToken 
  } = useBling();
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [malhas, setMalhas] = useState<Produto[]>([]);
  const [ribanas, setRibanas] = useState<Produto[]>([]);
  const [servicos, setServicos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizandoMalha, setSincronizandoMalha] = useState(false);
  const [sincronizandoRibana, setSincronizandoRibana] = useState(false);
  const [sincronizandoServico, setSincronizandoServico] = useState(false);
  const [sincronizandoFornecedor, setSincronizandoFornecedor] = useState(false);

  const carregarDados = async () => {
    try {
      const [produtosData, malhasData, ribanasData, servicosData, fornecedoresData] = await Promise.all([
        getProdutos(),
        getMalhas(),
        getRibanas(),
        getServicos(),
        getFornecedores()
      ]);
      setProdutos(produtosData);
      setMalhas(malhasData);
      setRibanas(ribanasData);
      setServicos(servicosData);
      setFornecedores(fornecedoresData);
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

  const tableContainerStyle = {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '70vh'
  };

  const tableStyle = {
    minWidth: 650
  };

  const nameCellStyle = {
    padding: '16px',
    fontSize: '14px',
    maxWidth: '500px',
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    overflowWrap: 'break-word'
  };

  const otherCellStyle = {
    padding: '16px',
    fontSize: '14px',
    minWidth: '100px'
  };

  return (
    <Box>
      <Box sx={{ mb: 3, mt: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Registros</Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleChangeTab}>
            <Tab label="Produtos" />
            <Tab label="Malhas" />
            <Tab label="Ribanas" />
            <Tab label="Serviços" />
            <Tab label="Fornecedores" />
          </Tabs>
        </Box>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <Box>
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
            <TableContainer sx={tableContainerStyle}>
              <Table sx={tableStyle}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={otherCellStyle}>ID</TableCell>
                    <TableCell sx={otherCellStyle}>Código</TableCell>
                    <TableCell sx={nameCellStyle}>Nome</TableCell>
                    <TableCell sx={otherCellStyle}>ID Produto Pai</TableCell>
                    <TableCell sx={otherCellStyle}>Situação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : produtos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell sx={otherCellStyle}>{produto.id}</TableCell>
                        <TableCell sx={otherCellStyle}>{produto.codigo}</TableCell>
                        <TableCell sx={nameCellStyle}>{produto.nome}</TableCell>
                        <TableCell sx={otherCellStyle}>{produto.idProdutoPai || "-"}</TableCell>
                        <TableCell sx={otherCellStyle}>{produto.situacao}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Box>
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
            <TableContainer sx={tableContainerStyle}>
              <Table sx={tableStyle}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={otherCellStyle}>ID</TableCell>
                    <TableCell sx={otherCellStyle}>Código</TableCell>
                    <TableCell sx={nameCellStyle}>Nome</TableCell>
                    <TableCell sx={otherCellStyle}>ID Produto Pai</TableCell>
                    <TableCell sx={otherCellStyle}>Situação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingMalha ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : malhas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Nenhuma malha encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    malhas.map((malha) => (
                      <TableRow key={malha.id}>
                        <TableCell sx={otherCellStyle}>{malha.id}</TableCell>
                        <TableCell sx={otherCellStyle}>{malha.codigo}</TableCell>
                        <TableCell sx={nameCellStyle}>{malha.nome}</TableCell>
                        <TableCell sx={otherCellStyle}>{malha.idProdutoPai || "-"}</TableCell>
                        <TableCell sx={otherCellStyle}>{malha.situacao}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Box>
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
            <TableContainer sx={tableContainerStyle}>
              <Table sx={tableStyle}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={otherCellStyle}>ID</TableCell>
                    <TableCell sx={otherCellStyle}>Código</TableCell>
                    <TableCell sx={nameCellStyle}>Nome</TableCell>
                    <TableCell sx={otherCellStyle}>ID Produto Pai</TableCell>
                    <TableCell sx={otherCellStyle}>Situação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingRibana ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : ribanas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Nenhuma ribana encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    ribanas.map((ribana) => (
                      <TableRow key={ribana.id}>
                        <TableCell sx={otherCellStyle}>{ribana.id}</TableCell>
                        <TableCell sx={otherCellStyle}>{ribana.codigo}</TableCell>
                        <TableCell sx={nameCellStyle}>{ribana.nome}</TableCell>
                        <TableCell sx={otherCellStyle}>{ribana.idProdutoPai || "-"}</TableCell>
                        <TableCell sx={otherCellStyle}>{ribana.situacao}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={async () => {
                setSincronizandoServico(true);
                try {
                  const token = await atualizarToken();
                  await sincronizarServicos(token);
                  await carregarDados();
                } catch (err) {
                  console.error('Erro ao sincronizar serviços:', err);
                } finally {
                  setSincronizandoServico(false);
                }
              }}
              disabled={sincronizandoServico}
            >
              {sincronizandoServico ? 'Sincronizando...' : 'Sincronizar Serviços'}
            </Button>
          </Box>
          <Paper>
            <TableContainer sx={tableContainerStyle}>
              <Table sx={tableStyle}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={otherCellStyle}>ID</TableCell>
                    <TableCell sx={nameCellStyle}>Nome</TableCell>
                    <TableCell sx={otherCellStyle}>Situação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingServico ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : servicos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Nenhum serviço encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    servicos.map((servico) => (
                      <TableRow key={servico.id}>
                        <TableCell sx={otherCellStyle}>{servico.id}</TableCell>
                        <TableCell sx={nameCellStyle}>{servico.nome}</TableCell>
                        <TableCell sx={otherCellStyle}>{servico.situacao}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={async () => {
                setSincronizandoFornecedor(true);
                try {
                  const token = await atualizarToken();
                  await sincronizarFornecedores(token);
                  await carregarDados();
                } catch (err) {
                  console.error('Erro ao sincronizar fornecedores:', err);
                } finally {
                  setSincronizandoFornecedor(false);
                }
              }}
              disabled={sincronizandoFornecedor}
            >
              {sincronizandoFornecedor ? 'Sincronizando...' : 'Sincronizar Fornecedores'}
            </Button>
          </Box>
          <Paper>
            <TableContainer sx={tableContainerStyle}>
              <Table sx={tableStyle}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={otherCellStyle}>ID</TableCell>
                    <TableCell sx={otherCellStyle}>Código</TableCell>
                    <TableCell sx={nameCellStyle}>Nome</TableCell>
                    <TableCell sx={otherCellStyle}>Situação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingFornecedor ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : fornecedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Nenhum fornecedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fornecedores.map((fornecedor) => (
                      <TableRow key={fornecedor.id}>
                        <TableCell sx={otherCellStyle}>{fornecedor.id}</TableCell>
                        <TableCell sx={otherCellStyle}>{fornecedor.codigo}</TableCell>
                        <TableCell sx={nameCellStyle}>{fornecedor.nome}</TableCell>
                        <TableCell sx={otherCellStyle}>{fornecedor.situacao}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default Registros;
