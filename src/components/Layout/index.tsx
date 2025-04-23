import { Box, Container, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Button, Menu, MenuItem } from '@mui/material';
import { Menu as MenuIcon, Dashboard, Assignment, Settings, Inventory, LocalShipping, Payment, Layers, AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';

const Layout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Ordens de Produção', icon: <Assignment />, path: '/ordens' },
    { text: 'Recebimento', icon: <LocalShipping />, path: '/ordens/recebimento' },
    { text: 'Lançamento de Malha', icon: <Layers />, path: '/ordens/lancamento-malha' },
    { text: 'Pagamento', icon: <Payment />, path: '/ordens/pagamento' },
    { text: 'Registros', icon: <Inventory />, path: '/registros' },
    { text: 'Usuários', icon: <Settings />, path: '/configuracoes' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          {/* Trocar o nome pelo logo + texto "loop" (corrigido para Vite) */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img
              src="/assets/loop.png"
              alt="Loop Logo"
              style={{ height: 64, marginRight: 12 }}
            />
          </Box>
          {user && (
            <div>
              <Button
                color="inherit"
                onClick={handleMenu}
                startIcon={<AccountCircle />}
              >
                {user.email}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  Função: {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </MenuItem>
                <MenuItem onClick={handleLogout}>Sair</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {menuItems.map((item) => (
              <ListItem 
                key={item.text} 
                onClick={() => handleNavigate(item.path)}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8,
          pb: 4,
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
