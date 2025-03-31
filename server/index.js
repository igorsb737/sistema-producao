const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Carrega as variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rota de teste
app.get('/api/email/test', (req, res) => {
  res.json({ message: 'Servidor de email funcionando!' });
});

// Rota para enviar email
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, pdfBuffer, opNumber } = req.body;

    if (!to || !pdfBuffer || !opNumber) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    console.log(`Tentando enviar email para: ${to}`);
    console.log(`Usando host: ${process.env.EMAIL_HOST}`);
    console.log(`Usando porta: ${process.env.EMAIL_PORT}`);
    console.log(`Usando usuário: ${process.env.EMAIL_USER}`);

    // Configuração do transportador de email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Configuração do email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: `Nova OP ${opNumber}`,
      text: 'Nova Ordem de Produção em Anexo',
      attachments: [{
        filename: `ordem-producao-${opNumber}.pdf`,
        content: Buffer.from(pdfBuffer, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    // Envio do email
    await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso!');

    res.status(200).json({ message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: `Erro ao enviar email: ${error.message}` });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor de email rodando na porta ${PORT}`);
});
