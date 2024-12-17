# Test script for bootstrap validation
# This script tests the bootstrap process in a safe environment

# Function to create a test environment
function New-TestEnvironment {
    $testDir = Join-Path $env:TEMP "ai-pipeline-test"
    
    # Clean up existing test directory
    if (Test-Path $testDir) {
        Remove-Item -Path $testDir -Recurse -Force
    }
    
    # Create test directory structure
    New-Item -ItemType Directory -Path $testDir | Out-Null
    
    # Create minimal package.json
    @{
        name = "ai-pipeline-test"
        version = "1.0.0"
    } | ConvertTo-Json | Set-Content (Join-Path $testDir "package.json")
    
    # Create scripts directory
    New-Item -ItemType Directory -Path (Join-Path $testDir "scripts") | Out-Null
    
    return $testDir
}

# Function to run bootstrap tests
function Test-Bootstrap {
    param (
        [string]$testDir
    )
    
    $errors = @()
    
    # Test 1: Project root detection
    Write-Host "Test 1: Project root detection..." -ForegroundColor Cyan
    try {
        Set-Location $testDir
        . .\bootstrap.ps1 -TestMode
        Write-Host "  ✓ Project root detected successfully" -ForegroundColor Green
    } catch {
        $errors += "Project root detection failed: $($_.Exception.Message)"
        Write-Host "  ✗ Project root detection failed" -ForegroundColor Red
    }
    
    # Test 2: Script location validation
    Write-Host "Test 2: Script location validation..." -ForegroundColor Cyan
    try {
        $setupScript = Join-Path $testDir "scripts\setup-environment.ps1"
        if (-not (Test-Path $setupScript)) {
            throw "Setup script not found"
        }
        Write-Host "  ✓ Script location validated successfully" -ForegroundColor Green
    } catch {
        $errors += "Script location validation failed: $($_.Exception.Message)"
        Write-Host "  ✗ Script location validation failed" -ForegroundColor Red
    }
    
    return $errors
}

# Test Node.js installation
function Test-NodeSetup {
    Write-Host "Test 3: Node.js installation..." -ForegroundColor Cyan
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "  ✓ Node.js ($nodeVersion) and npm ($npmVersion) installed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ✗ Node.js installation check failed" -ForegroundColor Red
        return $false
    }
}

# Main test execution
try {
    Write-Host "Starting bootstrap validation tests..." -ForegroundColor Cyan
    
    # Create test environment
    $testDir = New-TestEnvironment
    Write-Host "Created test environment at: $testDir" -ForegroundColor Green
    
    # Copy required files to test environment
    Copy-Item "bootstrap.ps1" -Destination $testDir
    Copy-Item "setup-environment.ps1" -Destination (Join-Path $testDir "scripts")
    
    # Run tests
    $errors = Test-Bootstrap $testDir
    
    # Test Node.js setup
    if (-not (Test-NodeSetup)) {
        $errors += "Node.js installation failed"
    }
    
    # Report results
    if ($errors.Count -eq 0) {
        Write-Host "`nAll tests passed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nTest failures found:" -ForegroundColor Red
        $errors | ForEach-Object {
            Write-Host "- $_" -ForegroundColor Red
        }
        exit 1
    }
    
} catch {
    Write-Host "Error during test execution:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Clean up test environment
    if (Test-Path $testDir) {
        Remove-Item -Path $testDir -Recurse -Force
    }
} 