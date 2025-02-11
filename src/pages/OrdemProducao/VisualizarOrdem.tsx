import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { Box, Typography, Paper, CircularProgress, Grid, Chip } from '@mui/material';

function VisualizarOrdem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ordens, loading, error } = useOrdemProducao();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const ordem = ordens.find(o => o.numero === (id || '').padStart(4, '0'));

  if (!ordem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Ordem não encontrada</Typography>
      </Box>
    );
  }

  // Se a ordem estiver em rascunho, redireciona para a tela de edição
  if (ordem.status === 'Rascunho') {
    return <Navigate to={`/ordens/editar/${ordem.numero}`} replace />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Ordem de Produção #{ordem.numero}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Cliente
            </Typography>
            <Typography variant="body1">{ordem.cliente}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Chip 
              label={ordem.status}
              color={ordem.status === 'Aberta' ? 'primary' : ordem.status === 'Finalizado' ? 'success' : 'default'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Data de Início
            </Typography>
            <Typography variant="body1">{ordem.dataInicio}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Data de Entrega
            </Typography>
            <Typography variant="body1">{ordem.dataEntrega}</Typography>
          </Grid>

          {ordem.dataFechamento && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Data de Fechamento
              </Typography>
              <Typography variant="body1">{ordem.dataFechamento}</Typography>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Total de Camisetas
            </Typography>
            <Typography variant="body1">{ordem.totalCamisetas}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Item
            </Typography>
            <Typography variant="body1">{ordem.item}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Malha
            </Typography>
            <Typography variant="body1">{ordem.malha}</Typography>
          </Grid>

          {ordem.consumoMalha && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Consumo de Malha
              </Typography>
              <Typography variant="body1">{ordem.consumoMalha}</Typography>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Ribana
            </Typography>
            <Typography variant="body1">{ordem.ribana}</Typography>
          </Grid>

          {ordem.consumoRibana && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Consumo de Ribana
              </Typography>
              <Typography variant="body1">{ordem.consumoRibana}</Typography>
            </Grid>
          )}

          {ordem.observacao && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Observação
              </Typography>
              <Typography variant="body1">{ordem.observacao}</Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Grades
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {ordem.grades.map((grade, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Código
                      </Typography>
                      <Typography variant="body1">{grade.codigo}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Quantidade Prevista
                      </Typography>
                      <Typography variant="body1">{grade.quantidadePrevista}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Entregas
                      </Typography>
                      <Typography variant="body1">
                        {grade.entregas?.length > 0 
                          ? grade.entregas.join(', ')
                          : 'Nenhuma entrega registrada'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default VisualizarOrdem;
