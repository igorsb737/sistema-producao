import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

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

const auth = getAuth(app);

export { database, auth };
