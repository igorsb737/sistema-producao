import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Divider,
  Alert,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth.tsx';

interface UserFormData {
  email: string;
  password: string;
  role: 'admin' | 'colaborador';
  permissions: {
    dashboard: boolean;
    ordemProducao: {
      view: boolean;
      create: boolean;
    };
    recebimentos: {
      view: boolean;
      create: boolean;
    };
    lancamentoMalha: {
      view: boolean;
      create: boolean;
    };
    pagamentos: {
      view: boolean;
      create: boolean;
      conciliar: boolean;
    };
    registros: {
      view: boolean;
      sync: boolean;
    };
  };
}

const initialPermissions = {
  dashboard: false,
  ordemProducao: {
    view: false,
    create: false,
  },
  recebimentos: {
    view: false,
    create: false,
  },
  lancamentoMalha: {
    view: false,
    create: false,
  },
  pagamentos: {
    view: false,
    create: false,
    conciliar: false,
  },
  registros: {
    view: false,
    sync: false,
  },
};

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Configuracoes() {
  const { user, createUser, getAllUsers, updateUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UserFormData | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    role: 'colaborador',
    permissions: initialPermissions,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const usersList = await getAllUsers();
      setUsers(usersList);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditClick = (userToEdit: any) => {
    setSelectedUser(userToEdit);
    setEditFormData({
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
      permissions: userToEdit.permissions || initialPermissions,
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setEditFormData(null);
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!selectedUser || !editFormData) return;

    try {
      await updateUser(selectedUser.uid, {
        role: editFormData.role,
        permissions: editFormData.permissions,
      });
      
      await loadUsers();
      handleEditClose();
    } catch (error: any) {
      setEditError(error.message);
    }
  };

  const handleEditPermissionChange = (
    section: keyof typeof initialPermissions,
    field: string,
    value: boolean
  ) => {
    if (!editFormData) return;

    setEditFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [section]:
            typeof prev.permissions[section] === 'object'
              ? {
                  ...prev.permissions[section],
                  [field]: value,
                }
              : value,
        },
      };
    });
  };

  if (user?.role !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Você não tem permissão para acessar esta página.
        </Alert>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await createUser(
        formData.email,
        formData.password,
        formData.role,
        formData.permissions
      );
      setSuccess('Usuário criado com sucesso!');
      setFormData({
        email: '',
        password: '',
        role: 'colaborador',
        permissions: initialPermissions,
      });
    } catch (error) {
      setError('Erro ao criar usuário. Verifique os dados e tente novamente.');
    }
  };

  const handlePermissionChange = (
    section: keyof typeof initialPermissions,
    field: string,
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]:
          typeof prev.permissions[section] === 'object'
            ? {
                ...prev.permissions[section],
                [field]: value,
              }
            : value,
      },
    }));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Configurações
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Criar Usuário" />
          <Tab label="Gerenciar Usuários" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Criar Novo Usuário
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Função</InputLabel>
                <Select
                  value={formData.role}
                  label="Função"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: e.target.value as 'admin' | 'colaborador',
                    }))
                  }
                >
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="colaborador">Colaborador</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.role === 'colaborador' && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Permissões
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.dashboard}
                        onChange={(e) =>
                          handlePermissionChange(
                            'dashboard',
                            'dashboard',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Acessar Dashboard"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Ordens de Produção
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.ordemProducao.view}
                        onChange={(e) =>
                          handlePermissionChange(
                            'ordemProducao',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Ordens"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.ordemProducao.create}
                        onChange={(e) =>
                          handlePermissionChange(
                            'ordemProducao',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Criar Ordens"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Recebimentos
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.recebimentos.view}
                        onChange={(e) =>
                          handlePermissionChange(
                            'recebimentos',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Recebimentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.recebimentos.create}
                        onChange={(e) =>
                          handlePermissionChange(
                            'recebimentos',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Recebimentos"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Lançamento de Malha
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.lancamentoMalha.view}
                        onChange={(e) =>
                          handlePermissionChange(
                            'lancamentoMalha',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Lançamentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.lancamentoMalha.create}
                        onChange={(e) =>
                          handlePermissionChange(
                            'lancamentoMalha',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Lançamentos"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Pagamentos
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.pagamentos.view}
                        onChange={(e) =>
                          handlePermissionChange(
                            'pagamentos',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Pagamentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.pagamentos.create}
                        onChange={(e) =>
                          handlePermissionChange(
                            'pagamentos',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Pagamentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.pagamentos.conciliar}
                        onChange={(e) =>
                          handlePermissionChange(
                            'pagamentos',
                            'conciliar',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Conciliações"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Registros
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.registros.view}
                        onChange={(e) =>
                          handlePermissionChange(
                            'registros',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Registros"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.permissions.registros.sync}
                        onChange={(e) =>
                          handlePermissionChange(
                            'registros',
                            'sync',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Sincronizar Produtos"
                  />
                </FormGroup>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
              >
                Criar Usuário
              </Button>
            </Grid>
          </Grid>
        </form>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Usuários Cadastrados
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Função</TableCell>
                  <TableCell>Permissões</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin'
                        ? 'Acesso Total'
                        : Object.entries(user.permissions || {})
                            .filter(([_, value]) => 
                              typeof value === 'object' 
                                ? Object.values(value as Record<string, boolean>).some(v => v === true)
                                : value === true
                            )
                            .map(([key]) => key)
                            .join(', ')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleEditClick(user)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Editar Usuário: {selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}

          {editFormData && (
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Função</InputLabel>
                <Select
                  value={editFormData.role}
                  label="Função"
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev!,
                      role: e.target.value as 'admin' | 'colaborador',
                    }))
                  }
                >
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="colaborador">Colaborador</MenuItem>
                </Select>
              </FormControl>

              {editFormData.role === 'colaborador' && (
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.dashboard}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'dashboard',
                            'dashboard',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Acessar Dashboard"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Ordens de Produção
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.ordemProducao.view}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'ordemProducao',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Ordens"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.ordemProducao.create}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'ordemProducao',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Criar Ordens"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Recebimentos
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.recebimentos.view}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'recebimentos',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Recebimentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.recebimentos.create}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'recebimentos',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Recebimentos"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Lançamento de Malha
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.lancamentoMalha.view}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'lancamentoMalha',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Lançamentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.lancamentoMalha.create}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'lancamentoMalha',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Lançamentos"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Pagamentos
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.pagamentos.view}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'pagamentos',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Pagamentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.pagamentos.create}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'pagamentos',
                            'create',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Pagamentos"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.pagamentos.conciliar}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'pagamentos',
                            'conciliar',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Realizar Conciliações"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Registros
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.registros.view}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'registros',
                            'view',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Visualizar Registros"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.permissions.registros.sync}
                        onChange={(e) =>
                          handleEditPermissionChange(
                            'registros',
                            'sync',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Sincronizar Produtos"
                  />
                </FormGroup>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancelar</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
