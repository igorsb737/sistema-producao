const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

async function setupAdmin() {
  try {
    const adminEmail = 'igorsempre737@gmail.com';
    const userRecord = await admin.auth().getUserByEmail(adminEmail);
    const uid = userRecord.uid;

    await admin.database().ref(`users/${uid}`).set({
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
    });

    console.log('Admin user structure created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupAdmin();
