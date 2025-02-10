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

export const Produtos = () => {
  const { loading, error, sincronizarProdutos, getProdutos, atualizarToken } = useBling();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  const carregarProdutos = async () => {
    try {
      const data = await getProdutos();
      setProdutos(data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const token = await atualizarToken(); // Primeiro atualiza o token via webhook
      await sincronizarProdutos(token); // Usa o token retornado para sincronizar
      await carregarProdutos();
    } catch (err) {
      console.error('Erro ao sincronizar produtos:', err);
    } finally {
      setSincronizando(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Produtos</Typography>
        <Button
          variant="contained"
          startIcon={<SyncIcon />}
          onClick={handleSincronizar}
          disabled={sincronizando}
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar com Bling'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Preço</TableCell>
                <TableCell>Situação</TableCell>
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
                    <TableCell>{produto.codigo}</TableCell>
                    <TableCell>{produto.nome}</TableCell>
                    <TableCell>
                      {produto.preco.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell>{produto.situacao}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Produtos;
