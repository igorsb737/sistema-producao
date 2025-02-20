import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  getAuth,
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from '../config/firebase';

interface AuthUser extends User {
  role?: 'admin' | 'colaborador';
  permissions?: {
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

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, role: 'admin' | 'colaborador', permissions: AuthUser['permissions']) => Promise<void>;
  getAllUsers: () => Promise<AuthUser[]>;
  updateUser: (uid: string, data: { role: 'admin' | 'colaborador'; permissions: AuthUser['permissions'] }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

interface FirebaseUser {
  uid: string;
  email: string;
  role: 'admin' | 'colaborador';
  permissions: AuthUser['permissions'];
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeAdminUser = async () => {
    try {
      const adminEmail = 'igorsempre737@gmail.com';
      const adminPassword = 'admin123'; // Senha temporária que deve ser alterada após o primeiro login

      // Tenta fazer login com as credenciais do admin
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
        .then(async (result) => {
          // Verificar se o admin tem as permissões corretas
          const userRef = ref(database, `users/${result.user.uid}`);
          const snapshot = await get(userRef);
          
          if (!snapshot.exists()) {
            console.error('Admin existe mas não tem dados no banco');
            return;
          }

          const userData = snapshot.val();
          if (userData.role !== 'admin') {
            console.error('Usuário não tem papel de admin');
            return;
          }

          console.log('Admin já existe e está configurado corretamente');
        })
        .catch(async (error) => {
          if (error.code === 'auth/user-not-found') {
            // Se o usuário não existe, cria o admin
            // Criar o usuário admin
            const result = await createUserWithEmailAndPassword(
              auth,
              adminEmail,
              adminPassword
            );

            // Referência para o usuário no banco
            const userRef = ref(database, `users/${result.user.uid}`);
            
            // Dados do admin
            const adminData = {
              email: adminEmail,
              role: 'admin',
              permissions: {
                dashboard: true,
                ordemProducao: {
                  view: true,
                  create: true,
                },
                recebimentos: {
                  view: true,
                  create: true,
                },
                lancamentoMalha: {
                  view: true,
                  create: true,
                },
                pagamentos: {
                  view: true,
                  create: true,
                  conciliar: true,
                },
                registros: {
                  view: true,
                  sync: true,
                },
              },
            };

            // Salvar dados no banco
            await set(userRef, adminData);

            // Verificar se os dados foram salvos corretamente
            const snapshot = await get(userRef);
            if (!snapshot.exists()) {
              console.error('Erro: Dados do admin não foram salvos no banco');
              return;
            }

            console.log('Admin criado e configurado com sucesso');
          }
        });
    } catch (error: any) {
      console.error('Erro detalhado ao inicializar admin:', {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      // Não lançamos o erro aqui para não bloquear a inicialização do app
      // mas logamos para debug
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        const enhancedUser: AuthUser = {
          ...firebaseUser,
          role: userData?.role,
          permissions: userData?.permissions,
        };

        setUser(enhancedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Limpar qualquer usuário anterior
        if (auth.currentUser) {
          await firebaseSignOut(auth);
        }

        // Tentar fazer login
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Verificar dados no banco
        const userRef = ref(database, `users/${result.user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
          await firebaseSignOut(auth);
          throw new Error('Usuário não encontrado no banco de dados');
        }

        const userData = snapshot.val();
        
        // Verificar se o usuário tem um papel válido
        if (!userData.role || !userData.permissions) {
          await firebaseSignOut(auth);
          throw new Error('Usuário não tem permissões configuradas');
        }

        const enhancedUser: AuthUser = {
          ...result.user,
          role: userData.role,
          permissions: userData.permissions,
        };
        
        setUser(enhancedUser);
        return; // Login bem sucedido, sair do loop
        
      } catch (error: any) {
        console.error('Erro detalhado no login (tentativa ' + (retryCount + 1) + '):', {
          code: error.code,
          message: error.message,
          fullError: error
        });

        // Se for erro de rede, tentar novamente
        if (error.code === 'auth/network-request-failed' && retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Espera crescente entre tentativas
          continue;
        }

        // Para outros erros, lançar imediatamente
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            throw new Error('Email ou senha inválidos');
          case 'auth/too-many-requests':
            throw new Error('Muitas tentativas de login. Tente novamente mais tarde.');
          case 'auth/network-request-failed':
            throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
          default:
            throw new Error(`Erro ao fazer login: ${error.message}`);
        }
      }
    }
  };

  const createUser = async (
    email: string,
    password: string,
    role: 'admin' | 'colaborador',
    permissions: AuthUser['permissions']
  ) => {
    try {
      // Salvar referência do usuário atual
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Nenhum usuário logado');
      }

      // Desabilitar o listener temporariamente
      const unsubscribe = onAuthStateChanged(auth, () => {});
      unsubscribe();

      // Criar novo usuário usando um auth secundário
      const secondaryAuth = getAuth();
      const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUserRef = ref(database, `users/${result.user.uid}`);
      
      // Salvar dados do novo usuário
      await set(newUserRef, {
        email,
        role,
        permissions,
      });

      // Reativar o listener mantendo o usuário atual
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          const userData = snapshot.val();

          const enhancedUser: AuthUser = {
            ...firebaseUser,
            role: userData?.role,
            permissions: userData?.permissions,
          };

          setUser(enhancedUser);
        } else {
          setUser(null);
        }
      });

      // Deslogar da instância secundária
      await firebaseSignOut(secondaryAuth);
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const getAllUsers = async (): Promise<AuthUser[]> => {
    try {
      // Verificar se o usuário atual é admin
      if (!user || user.role !== 'admin') {
        throw new Error('Apenas administradores podem listar usuários');
      }

      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const users: AuthUser[] = [];
      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val() as FirebaseUser;
        users.push({
          uid: childSnapshot.key as string,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions,
        } as AuthUser);
      });

      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  };

  const updateUser = async (
    uid: string,
    data: { role: 'admin' | 'colaborador'; permissions: AuthUser['permissions'] }
  ): Promise<void> => {
    try {
      // Verificar se o usuário atual é admin
      if (!user || user.role !== 'admin') {
        throw new Error('Apenas administradores podem atualizar usuários');
      }

      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = snapshot.val();
      
      // Atualizar apenas role e permissions, mantendo outros dados
      await set(userRef, {
        ...userData,
        role: data.role,
        permissions: data.permissions,
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut: handleSignOut,
        createUser,
        getAllUsers,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
