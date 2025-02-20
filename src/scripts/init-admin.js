const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set, get } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyAib5pz5ra0VSaWEQcmILbtTuhy4NXKnBA",
  authDomain: "sistema-producao.firebaseapp.com",
  databaseURL: "https://sistema-producao-default-rtdb.firebaseio.com",
  projectId: "sistema-producao",
  storageBucket: "sistema-producao.firebasestorage.app",
  messagingSenderId: "297849868063",
  appId: "1:297849868063:web:aeada78aa756617ac0ea2a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

async function initializeAdmin() {
  try {
    const adminEmail = 'igorsempre737@gmail.com';
    const adminPassword = 'admin123';

    console.log('Iniciando configuração do admin...');

    try {
      // Tentar fazer login para obter o UID do usuário
      console.log('Tentando fazer login como admin...');
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      const uid = userCredential.user.uid;
      
      console.log('Login bem sucedido, verificando dados no banco...');
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      
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

      if (!snapshot.exists()) {
        console.log('Dados do admin não encontrados, criando...');
        await set(userRef, adminData);
        console.log('Dados do admin criados com sucesso');
      } else {
        const userData = snapshot.val();
        if (userData.role !== 'admin' || !userData.permissions) {
          console.log('Atualizando dados do admin...');
          await set(userRef, adminData);
          console.log('Dados do admin atualizados com sucesso');
        } else {
          console.log('Dados do admin já estão configurados corretamente');
        }
      }
    } catch (error) {
      if (error.code === 'auth/invalid-credential') {
        console.log('Credenciais inválidas. Verifique se a senha está correta.');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Erro ao configurar admin:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
  } finally {
    // Encerrar o processo após a conclusão
    process.exit();
  }
}

// Executar a inicialização
initializeAdmin();
