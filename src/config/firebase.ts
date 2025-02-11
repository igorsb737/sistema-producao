import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, DataSnapshot } from 'firebase/database';

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
const database = getDatabase(app);

// Verificar conexão com o Firebase
const connectedRef = ref(database, '.info/connected');
get(connectedRef)
  .then((snap: DataSnapshot) => {
    if (snap.val() === true) {
      console.log('Conectado ao Firebase Realtime Database');
    } else {
      console.log('Não conectado ao Firebase Realtime Database');
    }
  })
  .catch((error: Error) => {
    console.error('Erro ao verificar conexão com Firebase:', error);
  });

export { database };
