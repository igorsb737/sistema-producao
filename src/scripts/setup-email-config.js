// Script para configurar as credenciais do EmailJS no Firebase
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Carrega as variáveis de ambiente
dotenv.config();

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Função para configurar o EmailJS
async function setupEmailConfig() {
  try {
    console.log('Configurando EmailJS no Firebase...');
    
    // Solicita as informações do EmailJS
    const serviceId = process.env.EMAILJS_SERVICE_ID || 'seu_service_id';
    const templateId = process.env.EMAILJS_TEMPLATE_ID || 'seu_template_id';
    const userId = process.env.EMAILJS_USER_ID || 'seu_user_id';
    
    // Salva as configurações no Firebase
    const emailConfigRef = ref(database, 'config/email');
    await set(emailConfigRef, {
      serviceId,
      templateId,
      userId,
      updatedAt: new Date().toISOString()
    });
    
    console.log('Configurações de EmailJS salvas com sucesso!');
    
    // Verifica se as variáveis de ambiente estão definidas
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_USER_ID) {
      console.log('\nATENÇÃO: Algumas variáveis de ambiente do EmailJS não estão definidas.');
      console.log('Para configurar o EmailJS corretamente, adicione as seguintes variáveis ao seu arquivo .env:');
      console.log('EMAILJS_SERVICE_ID=seu_service_id');
      console.log('EMAILJS_TEMPLATE_ID=seu_template_id');
      console.log('EMAILJS_USER_ID=seu_user_id');
      console.log('\nVocê pode obter essas informações em https://dashboard.emailjs.com/');
    }
    
  } catch (error) {
    console.error('Erro ao configurar EmailJS:', error);
  }
}

// Executa a configuração
setupEmailConfig();
