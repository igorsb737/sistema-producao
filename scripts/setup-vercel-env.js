#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const variables = [
  {
    name: 'EMAIL_HOST',
    value: 'smtp.hostinger.com'
  },
  {
    name: 'EMAIL_PORT',
    value: '465'
  },
  {
    name: 'EMAIL_USER',
    value: 'producao@disquecamisetas.com.br'
  },
  {
    name: 'EMAIL_PASS',
    value: 'Prod010203!'
  }
];

console.log('Configurando variáveis de ambiente no Vercel...');

// Verifica se o Vercel CLI está instalado
try {
  execSync('vercel --version', { stdio: 'ignore' });
} catch (error) {
  console.log('\nVercel CLI não encontrado. Instalando...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
}

// Função para adicionar uma variável
const addVariable = (name, value) => {
  try {
    console.log(`\nAdicionando ${name}...`);
    execSync(`vercel env add ${name} production`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erro ao adicionar ${name}:`, error.message);
    return false;
  }
};

// Adiciona as variáveis uma por uma
console.log('\nPor favor, confirme cada variável quando solicitado.');
console.log('Você verá um prompt para cada variável.\n');

variables.forEach(variable => {
  console.log(`\nConfigurando ${variable.name}`);
  console.log(`Valor sugerido: ${variable.value}`);
  addVariable(variable.name, variable.value);
});

console.log('\nConfigurações concluídas!');
console.log('\nPara verificar as variáveis, acesse:');
console.log('https://vercel.com/dashboard -> Seu Projeto -> Settings -> Environment Variables');

rl.close();
