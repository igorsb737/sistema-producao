import { Box, Typography, Paper, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';

const Configuracoes = () => {
  const { numeroInicial, loading, error, salvarNumeroInicial } = useConfiguracoes();

  const handleSalvar = async () => {
    try {
      await salvarNumeroInicial(Number(numeroInicial));
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações');
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Configurações
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>
          Numeração das Ordens de Produção
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Número Inicial"
                type="number"
                value={numeroInicial}
                onChange={(e) => salvarNumeroInicial(Number(e.target.value))}
                fullWidth
                helperText="Define o número inicial para novas ordens de produção"
                sx={{ mb: 3 }}
              />
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Configuracoes;
