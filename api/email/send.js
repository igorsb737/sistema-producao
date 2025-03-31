import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Configuração do transportador de email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: true,
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

    res.status(200).json({ message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: 'Erro ao enviar email' });
  }
}
