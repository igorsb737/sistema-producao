import { useState } from 'react';
import { Box, Typography, Grid, Paper, Tabs, Tab } from '@mui/material';
import { useOrdemProducao, OrdemProducao } from '../../hooks/useOrdemProducao';
import DashboardEficiencia from './DashboardEficiencia';
import DashboardFluxo from './DashboardFluxo';

// Interface para as propriedades do TabPanel
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Componente TabPanel para exibir o conteúdo de cada aba
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Função auxiliar para acessibilidade
const a11yProps = (index: number) => {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
};

const Dashboard = () => {
  const { ordens, loading } = useOrdemProducao();
  const [tabValue, setTabValue] = useState(0);

  // Dados para o dashboard geral
  const ordensAbertas = ordens.filter((ordem: OrdemProducao) => ordem.informacoesGerais.status === 'Aberta').length;
  const ordensFinalizadas = ordens.filter((ordem: OrdemProducao) => ordem.informacoesGerais.status === 'Finalizado').length;
  const totalCamisetas = ordens.reduce((total: number, ordem: OrdemProducao) => total + ordem.informacoesGerais.totalCamisetas, 0);

  // Manipulador de mudança de aba
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2, mt: 3 }}>
        Dashboard
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Visão Geral" {...a11yProps(0)} />
          <Tab label="Eficiência de Produção" {...a11yProps(1)} />
          <Tab label="Conciliação Financeira" {...a11yProps(2)} />
          <Tab label="Fluxo de Produção" {...a11yProps(3)} />
          <Tab label="Qualidade e Desempenho" {...a11yProps(4)} />
        </Tabs>
      </Box>
      
      {/* Conteúdo da aba Visão Geral */}
      <TabPanel value={tabValue} index={0}>
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
      </TabPanel>
      
      {/* Conteúdo da aba Eficiência de Produção */}
      <TabPanel value={tabValue} index={1}>
        <DashboardEficiencia />
      </TabPanel>
      
      {/* Conteúdo da aba Conciliação Financeira */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="body1">
          Dashboard de Conciliação Financeira em desenvolvimento.
        </Typography>
      </TabPanel>
      
      {/* Conteúdo da aba Fluxo de Produção */}
      <TabPanel value={tabValue} index={3}>
        <DashboardFluxo />
      </TabPanel>
      
      {/* Conteúdo da aba Qualidade e Desempenho */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="body1">
          Dashboard de Qualidade e Desempenho em desenvolvimento.
        </Typography>
      </TabPanel>
    </Box>
  );
};

export default Dashboard;
