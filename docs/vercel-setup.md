# Configuração do Vercel

## Configurando Variáveis de Ambiente

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Clique na aba "Settings"
4. No menu lateral, clique em "Environment Variables"
5. Adicione as seguintes variáveis:

### EMAIL_HOST
- Nome: `EMAIL_HOST`
- Valor: `smtp.hostinger.com`
- Environment: `Production`

### EMAIL_PORT
- Nome: `EMAIL_PORT`
- Valor: `465`
- Environment: `Production`

### EMAIL_USER
- Nome: `EMAIL_USER`
- Valor: `producao@disquecamisetas.com.br`
- Environment: `Production`

### EMAIL_PASS
- Nome: `EMAIL_PASS`
- Valor: `Prod010203!`
- Environment: `Production`

## Screenshots do Processo

### Passo 1: Settings
![Settings](https://i.imgur.com/example1.png)
Na página do projeto, clique em "Settings" no menu superior.

### Passo 2: Environment Variables
![Environment Variables](https://i.imgur.com/example2.png)
No menu lateral esquerdo, selecione "Environment Variables".

### Passo 3: Adicionando Variáveis
![Add Variable](https://i.imgur.com/example3.png)
1. Clique em "Add New"
2. Preencha o nome e valor da variável
3. Selecione "Production" em Environment
4. Clique em "Add"
5. Repita o processo para cada variável

### Passo 4: Verificação
![Variables List](https://i.imgur.com/example4.png)
Após adicionar todas as variáveis, você verá a lista completa na página.

## Notas Importantes

- As variáveis são criptografadas e seguras
- Alterações nas variáveis requerem um novo deploy
- Você pode adicionar diferentes valores para Development e Preview se necessário
- Para testar localmente, use o arquivo `.env.local` com os mesmos valores
