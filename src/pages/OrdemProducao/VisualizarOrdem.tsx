import { useParams, Navigate } from 'react-router-dom';
import { useOrdemProducao, Status } from '../../hooks/useOrdemProducao';
import { Box, Typography, Paper, CircularProgress, Grid, Chip, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar } from '@mui/material';
import { PictureAsPdf as PdfIcon, Email as EmailIcon } from '@mui/icons-material';
import { generateOrdemPDF, downloadOrdemPDF } from '../../utils/pdfGenerator';
import { useEmail } from '../../hooks/useEmail';
import { useState } from 'react';

function VisualizarOrdem() {
  const { id } = useParams();
  const { ordens, loading, error } = useOrdemProducao();
  const { sendEmail, loading: sendingEmail, error: emailError } = useEmail();
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
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

  const ordem = ordens.find(o => o.informacoesGerais.numero === (id || '').padStart(4, '0'));

  if (!ordem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Ordem não encontrada</Typography>
      </Box>
    );
  }

  // Se a ordem estiver em rascunho, redireciona para a tela de edição
  if (ordem.informacoesGerais.status === 'Rascunho' as Status) {
    return <Navigate to={`/ordens/editar/${ordem.informacoesGerais.numero}`} replace />;
  }

  const handleSendEmail = async () => {
    try {
      const pdfBuffer = generateOrdemPDF(ordem);
      await sendEmail({
        to: emailTo,
        pdfBuffer,
        opNumber: ordem.informacoesGerais.numero
      });
      setOpenEmailDialog(false);
      setSnackbarMessage('Email enviado com sucesso!');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Erro ao enviar email. Tente novamente.');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Ordem de Produção #{ordem.informacoesGerais.numero}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PdfIcon />}
            onClick={() => downloadOrdemPDF(ordem)}
          >
            Baixar PDF
          </Button>
          <IconButton
            color="primary"
            onClick={() => setOpenEmailDialog(true)}
            title="Enviar por Email"
          >
            <EmailIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Cliente
            </Typography>
            <Typography variant="body1">{ordem.informacoesGerais.cliente}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Chip 
              label={ordem.informacoesGerais.status || "-"}
              color={
                ordem.informacoesGerais.status === 'Rascunho' ? 'default' :
                ordem.informacoesGerais.status === 'Aberta' ? 'primary' :
                ordem.informacoesGerais.status === 'Em Entrega' ? 'warning' :
                ordem.informacoesGerais.status === 'Finalizado' ? 'success' :
                'default'
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Data de Início
            </Typography>
            <Typography variant="body1">{ordem.informacoesGerais.dataInicio || "-"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Data de Entrega
            </Typography>
            <Typography variant="body1">{ordem.informacoesGerais.dataEntrega || "-"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Data de Fechamento
            </Typography>
            <Typography variant="body1">{ordem.informacoesGerais.dataFechamento || "-"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Total de Camisetas
            </Typography>
            <Typography variant="body1">{ordem.informacoesGerais.totalCamisetas || "-"}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Item
            </Typography>
            <Typography variant="body1">{ordem.solicitacao.item.nome || "-"}</Typography>
          </Grid>

          <Grid container item xs={12} spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Malha
              </Typography>
              <Typography variant="body1">{ordem.solicitacao.malha.nome || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Previsão Malha
              </Typography>
              <Typography variant="body1">{ordem.solicitacao.previsoes.malha || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Valor Malha
              </Typography>
              <Typography variant="body1">{ordem.solicitacao.previsoes.valorMalha || "-"}</Typography>
            </Grid>
          </Grid>

          <Grid container item xs={12} spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Ribana
              </Typography>
              <Typography variant="body1">{ordem.solicitacao.ribana.nome || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Previsão Ribana
              </Typography>
              <Typography variant="body1">{ordem.solicitacao.previsoes.ribana || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Valor Ribana
              </Typography>
              <Typography variant="body1">{ordem.solicitacao.previsoes.valorRibana || "-"}</Typography>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Observações
            </Typography>
            <Typography variant="body1">{ordem.informacoesGerais.observacao || "-"}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Grades
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(ordem.grades).map(([gradeId, grade]) => (
                <Paper key={gradeId} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Item Grade
                      </Typography>
                      <Typography variant="body1">{grade.nome || "-"}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Quantidade Prevista
                      </Typography>
                      <Typography variant="body1">{grade.quantidadePrevista || "-"}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 2 }}>
              Entregas
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(ordem.grades).map(([gradeId, grade]) => {
                if (!grade.recebimentos || grade.recebimentos.length === 0) return null;

                const subtotalGrade = grade.recebimentos.reduce((acc, rec) => acc + rec.quantidade, 0);

                return (
                  <Paper key={`entrega-${gradeId}`} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Grade: {grade.nome}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      {grade.recebimentos.map((recebimento, index) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography>
                            Data: {recebimento.data}
                          </Typography>
                          <Typography>
                            Quantidade: {recebimento.quantidade} unidades
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Typography variant="subtitle2" sx={{ textAlign: 'right' }}>
                      Subtotal da Grade: {subtotalGrade} unidades
                    </Typography>
                  </Paper>
                );
              })}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="h6">
                Total Geral: {
                  Object.values(ordem.grades).reduce((total, grade) => {
                    if (!grade.recebimentos) return total;
                    return total + grade.recebimentos.reduce((acc, rec) => acc + rec.quantidade, 0);
                  }, 0)
                } unidades
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={openEmailDialog} onClose={() => setOpenEmailDialog(false)}>
        <DialogTitle>Enviar Ordem de Produção por Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEmailDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSendEmail} 
            variant="contained" 
            disabled={!emailTo || sendingEmail}
          >
            {sendingEmail ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}

export default VisualizarOrdem;
