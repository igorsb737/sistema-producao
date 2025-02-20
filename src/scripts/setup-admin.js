const admin = require('firebase-admin');

const serviceAccount = {
  "type": "service_account",
  "project_id": "sistema-producao",
  "private_key_id": "4f54016beccaf7d71a9ca2cc771f1221d9731bb0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDwiIZu6gl8j/Xb\n8VdN1CnQGkGRzlU/ZEF0s4RUh9uO/+qSBN7rO0Ba4hjxTN4oQ9c6fOUyC0vFxYw+\nMa4jQIccyHVb8y5UD8sZiebM2ekDPkGsbaGLfv8WroaGSwOmMuoevNolUkmdD14D\neLP2ezDcu2C9Q1GyE36NIfvmfgYF+9JysFR/xZsgtiBksYszKcXPHgr/iwohpY+U\n2P0LMTFs8iVD+JJ/+iz9GObaBxyTs57iqOHASqCA0ef7mtpFrQzhW/GQFpwSwvo1\nZmzVczwblxuRAWSOH/B3qR7bGUOHVxMM7zt5rPwnYONB8jpkszrNIkTFRO1AH0u8\n4pwokWqDAgMBAAECggEAAujr6MCXunQ1ZGKa4fFR9iyzJAlBJRdYkV8F7U3dcpvs\nTGBBtXUjNgDr41NrkUTM1ZjNia7y941dwSIxufHIZf6TfjgcFIlCYD3iVxJrIWO/\nQKTs4jai7bUmdyPGLgcJ/Qg02A8S8+hL2gfmSXI7vkKIDOduar9AoILLkizDyY5j\nKr2dGebN79qzZ5C7kwo7CUYEBznnvkvu1GW+o723pYCM6YgXkwoNjfd1GuOU0UZe\nRpaDIF3mw07GvbXm4LhuwcV2KJjn3EZ8u/Yb4SwQTjPg7CX0HXCva6IeAl66AQfx\nlOwa3cRJK7WHUh5chsn3UtrHi5Khtm0hZgKRH6ANeQKBgQD7I8NXuMOEKM4BLRce\n47e/7VNM2aIzwsO+/jwfNJ7y2lZ65lsjY5hnY2+gsfhD3JqB8VqzywxQinJeoGZJ\nuG39Y/9ecM2pEfe05xOgClx7zjmcxzNOYLY7iqAg42HmoviP7PEYUbm3ZyXzHwHg\nNLL89q4drSuVqUEkth1vXbP1KQKBgQD1MDbRxh+vwMFYVkmZ25cF/QF7ty3I58kS\nnu4dqvkfPCu0BqXZTNQZcDgvR9tHTG4EeIEgmNVUk6m7dnGQFOwjY6zIRdmQn7TT\nnEyASN+0ictYkhefArGz9kd6xQ25NcFH6t7UydTv1PBJUJ+HSkPnrut+bjNL8kwL\n26zccBNLywKBgGhuMqijmAm4vhEXIuohXyNcGKt4RE6pyqP9LBr90qrBx/xLFdLd\nc15qptx3pPjzHvyx1Dm3UWOcbnqS0HYPTw1zK5ml5p9LbWm4PRzrshF5a9OZsegB\np0WTG4sRgoBZfGq86HRoZ4WwSsOSPUFyKIuwOC7294zAWOpfIFZS7KYhAoGBAKkz\nToFRAgjdMg/t6/i7Kus8/8sKTBQ6r+2js5rRo/1EHryrYcQlWrD7Wip2ogH/4mQ/\nbIy8K2ukQxtUz2WoqpR5coD6gvtk2vq0/63/nDEQbj1/A8H9r/gK2qUEW0YWrH0e\nvguGBOZEwlU1yAEq5NV7RpQHJGsimAwO2ql8xjQlAoGBALyG4L+ImVsT+BqLIb/L\naEtrQPGGlwNONEOLv3F3W8PT7chuk08IwhJdS5jBkXI2oB4p63OIT3cwi+y15phF\niZzMtfkWborUORBI+6gzIudkIRzJSwOtOMHjCqbVguFQ4s/P3Rpc0WWXQMC4hYNk\nHld394Ma6oeCuP1kyhjq9KdZ\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@sistema-producao.iam.gserviceaccount.com",
  "client_id": "114653865713590521401",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sistema-producao.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sistema-producao-default-rtdb.firebaseio.com"
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
