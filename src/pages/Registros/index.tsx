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

  const tableContainerStyle = {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '70vh'
  };

  const tableStyle = {
    minWidth: 650
  };

  const cellStyle = {
    padding: '16px',
    fontSize: '14px'
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
      <Typography variant="h4" sx={{ mb: 3, mt: 3 }}>Registros</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Produtos</Typography>
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
                  <TableCell sx={otherCellStyle}>Situação</TableCell>
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
                      <TableCell sx={otherCellStyle}>{produto.id}</TableCell>
                      <TableCell sx={otherCellStyle}>{produto.codigo}</TableCell>
                      <TableCell sx={nameCellStyle}>{produto.nome}</TableCell>
                      <TableCell sx={otherCellStyle}>{produto.situacao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Malhas</Typography>
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
                  <TableCell sx={otherCellStyle}>Situação</TableCell>
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
                      <TableCell sx={otherCellStyle}>{malha.id}</TableCell>
                      <TableCell sx={otherCellStyle}>{malha.codigo}</TableCell>
                      <TableCell sx={nameCellStyle}>{malha.nome}</TableCell>
                      <TableCell sx={otherCellStyle}>{malha.situacao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Ribanas</Typography>
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
                  <TableCell sx={otherCellStyle}>Situação</TableCell>
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
                      <TableCell sx={otherCellStyle}>{ribana.id}</TableCell>
                      <TableCell sx={otherCellStyle}>{ribana.codigo}</TableCell>
                      <TableCell sx={nameCellStyle}>{ribana.nome}</TableCell>
                      <TableCell sx={otherCellStyle}>{ribana.situacao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default Registros;
