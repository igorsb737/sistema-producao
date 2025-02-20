import { Box, Typography, Grid, Paper } from '@mui/material';
import { useOrdemProducao, OrdemProducao } from '../../hooks/useOrdemProducao';

const Dashboard = () => {
  const { ordens, loading } = useOrdemProducao();

  const ordensAbertas = ordens.filter((ordem: OrdemProducao) => ordem.informacoesGerais.status === 'Aberta').length;
  const ordensFinalizadas = ordens.filter((ordem: OrdemProducao) => ordem.informacoesGerais.status === 'Finalizado').length;
  const totalCamisetas = ordens.reduce((total: number, ordem: OrdemProducao) => total + ordem.informacoesGerais.totalCamisetas, 0);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, mt: 3 }}>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ordens em Aberto
            </Typography>
            <Typography variant="h3" color="primary">
              {loading ? '...' : ordensAbertas}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ordens Finalizadas
            </Typography>
            <Typography variant="h3" color="success.main">
              {loading ? '...' : ordensFinalizadas}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Total de Camisetas
            </Typography>
            <Typography variant="h3" color="info.main">
              {loading ? '...' : totalCamisetas}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
