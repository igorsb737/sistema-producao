# Sistema de Ordem de Produção

## Deploy no Vercel

### Pré-requisitos
- Conta no Vercel
- Git instalado
- Node.js instalado

### Passos para Deploy

1. Faça login no Vercel e importe o projeto do Git

2. Configure as seguintes variáveis de ambiente no Vercel:
```
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_USER=producao@disquecamisetas.com.br
EMAIL_PASS=Prod010203!
```

3. O Vercel detectará automaticamente que é um projeto Vite e configurará o build command como:
```
npm run vercel-build
```

4. Após o deploy, o endpoint de email estará disponível em:
```
https://seu-dominio.vercel.app/api/email/send
```

### Desenvolvimento Local

1. Clone o repositório
```bash
git clone <url-do-repositorio>
```

2. Instale as dependências
```bash
npm install
```

3. Crie um arquivo `.env.local` com as configurações:
```
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_USER=producao@disquecamisetas.com.br
EMAIL_PASS=Prod010203!
```

4. Execute o projeto
```bash
npm run dev
```

### Estrutura do Projeto

- `/api/email/send.js` - Função serverless para envio de email
- `/src/hooks/useEmail.ts` - Hook React para integração com a API
- `/src/utils/pdfGenerator.ts` - Gerador de PDF
- `/src/pages/OrdemProducao/VisualizarOrdem.tsx` - Componente com botão de envio

### Notas
- O envio de email usa o SMTP da Hostinger
- O PDF é gerado no cliente e enviado como base64
- As credenciais de email devem ser mantidas seguras no Vercel
