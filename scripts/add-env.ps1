# Valores das variáveis
$env:EMAIL_HOST = "smtp.hostinger.com"
$env:EMAIL_PORT = "465"
$env:EMAIL_USER = "producao@disquecamisetas.com.br"
$env:EMAIL_PASS = "Prod010203!"

# Função para adicionar variável
function Add-VercelEnv {
    param (
        [string]$name,
        [string]$value
    )
    Write-Host "Adding $name..."
    $value | vercel env add $name production
}

# Adicionar cada variável
Add-VercelEnv "EMAIL_HOST" $env:EMAIL_HOST
Add-VercelEnv "EMAIL_PORT" $env:EMAIL_PORT
Add-VercelEnv "EMAIL_USER" $env:EMAIL_USER
Add-VercelEnv "EMAIL_PASS" $env:EMAIL_PASS

Write-Host "Done!"
