const fs = require('fs');
const { execSync } = require('child_process');

// Lê o arquivo .env.production
const envContent = fs.readFileSync('.env.production', 'utf8');

// Parse as variáveis
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {});

// Função para adicionar uma variável
const addEnvVar = (key, value) => {
  // Cria um arquivo temporário com o valor
  const tempFile = `temp_${key}.txt`;
  fs.writeFileSync(tempFile, value);

  try {
    // Usa o arquivo temporário como input
    execSync(`type ${tempFile} | vercel env add ${key} production`, { stdio: 'inherit' });
    console.log(`✓ Added ${key}`);
  } catch (error) {
    console.error(`✗ Failed to add ${key}: ${error.message}`);
  } finally {
    // Remove o arquivo temporário
    fs.unlinkSync(tempFile);
  }
};

// Adiciona cada variável
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`Adding ${key}...`);
  addEnvVar(key, value);
});

console.log('Done!');
