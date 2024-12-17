# Setup Environment Script for Windows
# This script helps set up the development environment for the AI Development Pipeline

# Function to check if running as administrator
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent();
    $principal = New-Object Security.Principal.WindowsPrincipal $user;
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator);
}

# Function to check if a command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop;
        return $true;
    } catch {
        return $false;
    }
}

# Check if running as administrator
if (-not (Test-Administrator)) {
    Write-Host "Please run this script as Administrator" -ForegroundColor Red;
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow;
    exit 1;
}

# Source Node.js validation script
$nodeValidationScript = Join-Path $PSScriptRoot "nodejs-validation.ps1"
if (Test-Path $nodeValidationScript) {
    . $nodeValidationScript
} else {
    Write-Host "Warning: Node.js validation script not found. Using basic checks." -ForegroundColor Yellow
}

Write-Host "Setting up development environment..." -ForegroundColor Cyan

# Check Node.js installation
if (Get-Command "Test-NodeJsInstallation" -ErrorAction SilentlyContinue) {
    # Use enhanced validation
    $nodeStatus = Test-NodeJsInstallation -Verbose
    if (-not $nodeStatus.IsInstalled) {
        Write-Host "Node.js not found. Installing Node.js..." -ForegroundColor Yellow
        
        # Install Node.js
        if (-not (Install-NodeJS)) {
            Write-Host "Failed to install Node.js. Please install manually from https://nodejs.org/" -ForegroundColor Red
            exit 1
        }
    }
} else {
    # Fallback to basic check
    if (-not (Test-Command "node")) {
        Write-Host "Node.js not found. Installing Node.js..." -ForegroundColor Yellow
        
        # Install Node.js
        if (-not (Install-NodeJS)) {
            Write-Host "Failed to install Node.js. Please install manually from https://nodejs.org/" -ForegroundColor Red
            exit 1
        }
    }
}

# Verify Node.js installation
if (Test-Command "node") {
    $nodeVersion = node --version;
    Write-Host "Node.js installed successfully: $nodeVersion" -ForegroundColor Green;
} else {
    Write-Host "Failed to install Node.js. Please install manually from https://nodejs.org/" -ForegroundColor Red;
    exit 1;
}

# Check for npm
if (Test-Command "npm") {
    $npmVersion = npm --version;
    Write-Host "npm version: $npmVersion" -ForegroundColor Green;
    
    # Update npm if needed
    Write-Host "Updating npm to latest version..." -ForegroundColor Yellow;
    npm install -g npm@latest;
} else {
    Write-Host "npm not found. Please reinstall Node.js" -ForegroundColor Red;
    exit 1;
}

# Install global packages
Write-Host "Installing required global packages..." -ForegroundColor Yellow;
npm install -g typescript;

Write-Host "`nEnvironment setup completed!" -ForegroundColor Green;
Write-Host "You can now run 'npm install' to install project dependencies." -ForegroundColor Cyan; 