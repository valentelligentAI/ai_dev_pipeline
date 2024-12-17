# Bootstrap script for AI Development Pipeline
# This script ensures proper directory navigation and environment setup

# Function to normalize and validate path
function Get-NormalizedPath {
    param (
        [string]$path
    )
    
    try {
        # Remove any trailing '>' character (common copy-paste error)
        $path = $path -replace '>$', ''
        
        # Handle both forward and backward slashes
        $path = $path.Replace('/', '\')
        
        # Expand environment variables if present
        $path = [System.Environment]::ExpandEnvironmentVariables($path)
        
        # Convert to absolute path if relative
        if (-not [System.IO.Path]::IsPathRooted($path)) {
            $path = Join-Path $PWD $path
        }
        
        return $path
    } catch {
        throw "Failed to normalize path: $path`nError: $($_.Exception.Message)"
    }
}

# Function to safely change directory
function Set-LocationSafely {
    param (
        [string]$path
    )
    
    try {
        $normalizedPath = Get-NormalizedPath $path
        
        # Verify path exists
        if (-not (Test-Path $normalizedPath)) {
            throw "Directory does not exist: $normalizedPath"
        }
        
        # Change directory
        Set-Location -Path $normalizedPath -ErrorAction Stop
        Write-Host "Successfully changed directory to: $normalizedPath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Failed to change directory: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Current directory: $PWD" -ForegroundColor Yellow
        return $false
    }
}

# Function to collect system information
function Get-SystemInfo {
    $info = @{
        OS = [System.Environment]::OSVersion.ToString()
        PowerShell = $PSVersionTable.PSVersion.ToString()
        Architecture = [System.Environment]::GetEnvironmentVariable("PROCESSOR_ARCHITECTURE")
        ComputerName = [System.Environment]::MachineName
        UserName = [System.Environment]::UserName
        UserDomain = [System.Environment]::UserDomainName
        SystemDirectory = [System.Environment]::SystemDirectory
        ProcessorCount = [System.Environment]::ProcessorCount
        SystemPageSize = [System.Environment]::SystemPageSize
        WorkingDirectory = $PWD.Path
        PSExecutablePath = (Get-Process -Id $PID).Path
        EnvironmentVariables = @{}
    }

    # Collect relevant environment variables
    $relevantVars = @(
        "PATH", "TEMP", "TMP", "USERPROFILE", "APPDATA", 
        "LOCALAPPDATA", "ProgramFiles", "ProgramFiles(x86)",
        "SystemRoot", "COMPUTERNAME", "USERNAME"
    )

    foreach ($var in $relevantVars) {
        $info.EnvironmentVariables[$var] = [System.Environment]::GetEnvironmentVariable($var)
    }

    return $info
}

# Function to validate environment
function Test-Environment {
    $requirements = @(
        @{
            Name = "PowerShell Version"
            Test = { $PSVersionTable.PSVersion.Major -ge 5 }
            Message = "PowerShell 5.0 or higher is required"
        },
        @{
            Name = "Administrator Privileges"
            Test = {
                $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
                $principal = New-Object Security.Principal.WindowsPrincipal $identity
                $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
            }
            Message = "Administrator privileges are required"
        },
        @{
            Name = "Internet Connection"
            Test = { Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet }
            Message = "Internet connection is required"
        }
    )

    $failed = @()
    foreach ($req in $requirements) {
        Write-Host "Checking $($req.Name)..." -NoNewline
        if (& $req.Test) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " Failed" -ForegroundColor Red
            $failed += $req.Message
        }
    }

    return $failed
}

# Function to generate AI context file
function New-AIContext {
    param (
        [string]$projectRoot,
        [hashtable]$systemInfo
    )

    $context = @{
        timestamp = Get-Date -Format "o"
        system = $systemInfo
        project = @{
            root = $projectRoot
            hasPackageJson = Test-Path (Join-Path $projectRoot "package.json")
            hasTsConfig = Test-Path (Join-Path $projectRoot "tsconfig.json")
            hasGit = Test-Path (Join-Path $projectRoot ".git")
        }
        capabilities = @{
            isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
            hasInternet = Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet
            canWriteToUserProfile = Test-Path $env:USERPROFILE -PathType Container
        }
    }

    # Save context to file
    $contextPath = Join-Path $projectRoot ".ai-context.json"
    $context | ConvertTo-Json -Depth 10 | Set-Content $contextPath

    # Generate human-readable summary
    $summaryPath = Join-Path $projectRoot "AI_README.md"
    @"
# AI Development Context

## System Information
- OS: $($systemInfo.OS)
- PowerShell: $($systemInfo.PowerShell)
- Architecture: $($systemInfo.Architecture)

## Project Status
- Package.json: $($context.project.hasPackageJson)
- TypeScript Config: $($context.project.hasTsConfig)
- Git Repository: $($context.project.hasGit)

## Environment Capabilities
- Administrator Access: $($context.capabilities.isAdmin)
- Internet Connection: $($context.capabilities.hasInternet)
- User Profile Access: $($context.capabilities.canWriteToUserProfile)

## Important Paths
- Project Root: $($context.project.root)
- System Directory: $($systemInfo.SystemDirectory)
- Working Directory: $($systemInfo.WorkingDirectory)

## Notes for AI Assistant
1. This environment was validated at: $($context.timestamp)
2. Use Windows-style paths with backslashes
3. Consider administrator privileges when suggesting commands
4. Check internet connectivity before suggesting downloads
"@ | Set-Content $summaryPath

    Write-Host "Generated AI context files:" -ForegroundColor Cyan
    Write-Host "- $contextPath" -ForegroundColor Gray
    Write-Host "- $summaryPath" -ForegroundColor Gray
}

# Function to find project root
function Find-ProjectRoot {
    $currentPath = Get-Location
    
    # Check for common project files
    $indicators = @(
        "package.json",
        ".git",
        "tsconfig.json"
    )
    
    foreach ($indicator in $indicators) {
        if (Test-Path (Join-Path $currentPath $indicator)) {
            return $currentPath
        }
    }
    
    throw "Could not find project root. Please ensure you're in the correct directory."
}

# Function to validate file encoding
function Test-FileEncoding {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        if ($content -match '[\x80-\xFF]') {
            Write-Host "Warning: Non-ASCII characters detected in $filePath" -ForegroundColor Yellow
            Write-Host "This may cause issues with PowerShell execution" -ForegroundColor Yellow
            return $false
        }
        return $true
    } catch {
        Write-Host "Error checking file encoding: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Add this new function for more robust Node.js detection
function Get-NodeInstallationDetails {
    param()
    
    $nodeLocations = @(
        "${env:ProgramFiles}\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "${env:APPDATA}\nvm",
        "${env:LOCALAPPDATA}\Programs\nodejs"
    )
    
    $installations = @()
    
    foreach ($location in $nodeLocations) {
        if (Test-Path $location) {
            $nodeExe = Join-Path $location "node.exe"
            if (Test-Path $nodeExe) {
                try {
                    $version = & $nodeExe --version 2>$null
                    $installations += @{
                        Path = $location
                        Version = $version
                        Executable = $nodeExe
                        InPath = $env:Path -split ';' -contains $location
                    }
                } catch {
                    Write-Host "Found Node.js installation at $location but unable to determine version" -ForegroundColor Yellow
                }
            }
        }
    }
    
    return $installations
}

# Add this function for automated PATH repair
function Repair-NodePath {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable[]]$installations
    )
    
    $validInstall = $installations | Where-Object { Test-Path $_.Executable } | Select-Object -First 1
    
    if (-not $validInstall) {
        return $false
    }
    
    try {
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        $nodePath = $validInstall.Path
        
        if ($currentPath -notlike "*$nodePath*") {
            $newPath = "$currentPath;$nodePath"
            [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
            $env:Path = $newPath
            Write-Host "Added Node.js to PATH: $nodePath" -ForegroundColor Green
            return $true
        }
        
        return $true
    } catch {
        Write-Host "Failed to repair PATH: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Add this function to verify internet connectivity before download
function Test-InternetConnection {
    param (
        [string]$testUrl = "https://nodejs.org"
    )
    
    try {
        $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -Method Head -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        Write-Host "Internet connectivity test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Enhance the Install-NodeJs function with better error handling
function Install-NodeJs {
    param (
        [string]$version = "lts"
    )
    
    try {
        # Verify internet connectivity first
        if (-not (Test-InternetConnection)) {
            throw "No internet connection available. Cannot download Node.js installer."
        }

        # Create temporary directory for download
        $tempDir = Join-Path $env:TEMP "NodeJsInstall"
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
        
        # Determine architecture and construct download URL
        $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
        
        # Use more reliable URL construction
        $nodeUrl = "https://nodejs.org/dist/latest-v18.x/node-v18.18.0-$arch.msi"
        $installerPath = Join-Path $tempDir "nodejs_installer.msi"
        
        Write-Host "Downloading Node.js installer from $nodeUrl..." -ForegroundColor Cyan
        
        # Enhanced download with retry logic
        $maxRetries = 3
        $retryCount = 0
        $downloadSuccess = $false
        
        while (-not $downloadSuccess -and $retryCount -lt $maxRetries) {
            try {
                $webClient = New-Object System.Net.WebClient
                $webClient.DownloadFile($nodeUrl, $installerPath)
                if (Test-Path $installerPath) {
                    $downloadSuccess = $true
                    Write-Host "Download completed successfully" -ForegroundColor Green
                }
            } catch {
                $retryCount++
                Write-Host "Download attempt $retryCount failed: $($_.Exception.Message)" -ForegroundColor Yellow
                Start-Sleep -Seconds ($retryCount * 2)
            }
        }
        
        if (-not $downloadSuccess) {
            throw "Failed to download Node.js installer after $maxRetries attempts"
        }
        
        # Verify installer file
        if (-not (Test-Path $installerPath)) {
            throw "Installer file not found at: $installerPath"
        }
        
        Write-Host "Installing Node.js..." -ForegroundColor Cyan
        
        # Enhanced installation logging
        $logPath = Join-Path $tempDir "install.log"
        $arguments = @(
            "/i",
            "`"$installerPath`"",
            "/qn",
            "/L*v",
            "`"$logPath`"",
            "ADDLOCAL=ALL",
            "ALLUSERS=1"
        )
        
        $process = Start-Process "msiexec.exe" -ArgumentList $arguments -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Host "Node.js installation completed successfully" -ForegroundColor Green
            
            # Enhanced PATH refresh
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + 
                       [System.Environment]::GetEnvironmentVariable("Path", "User")
            
            # Verify installation
            $nodeVersion = & node --version 2>$null
            if ($nodeVersion) {
                Write-Host "Node.js $nodeVersion successfully installed and configured" -ForegroundColor Green
                
                # Install essential global packages
                Write-Host "Installing essential global packages..." -ForegroundColor Cyan
                & npm install -g npm@latest
                & npm install -g prettier
                
                return $true
            }
            
            Write-Host "Node.js installation completed but verification failed" -ForegroundColor Yellow
            return $false
        } else {
            Write-Host "Installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            if (Test-Path $logPath) {
                Write-Host "Installation log (last 10 lines):" -ForegroundColor Yellow
                Get-Content $logPath | Select-Object -Last 10
            }
            return $false
        }
        
    } catch {
        Write-Host "Error during Node.js installation: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        # Cleanup
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
    }
}

# Add this function to handle partial installations
function Repair-PartialNodeInstallation {
    param (
        [string]$existingPath = "C:\Program Files\nodejs"
    )
    
    Write-Host "Attempting to repair partial Node.js installation..." -ForegroundColor Cyan
    
    try {
        # Check if the installation is actually valid
        $nodeExe = Join-Path $existingPath "node.exe"
        $npmCmd = Join-Path $existingPath "npm.cmd"
        
        $hasValidFiles = (Test-Path $nodeExe) -and (Test-Path $npmCmd)
        
        if (-not $hasValidFiles) {
            Write-Host "Partial installation detected but files are missing. Recommending clean installation." -ForegroundColor Yellow
            return $false
        }
        
        # Try to repair PATH at both User and System level
        $paths = @(
            @{
                Scope = "User"
                Current = [Environment]::GetEnvironmentVariable("PATH", "User")
            },
            @{
                Scope = "Machine"
                Current = [Environment]::GetEnvironmentVariable("PATH", "Machine")
            }
        )
        
        foreach ($pathInfo in $paths) {
            if ($pathInfo.Current -notlike "*$existingPath*") {
                try {
                    $newPath = "$($pathInfo.Current);$existingPath"
                    [Environment]::SetEnvironmentVariable("PATH", $newPath, $pathInfo.Scope)
                    Write-Host "Added Node.js to $($pathInfo.Scope) PATH" -ForegroundColor Green
                } catch {
                    Write-Host "Failed to update $($pathInfo.Scope) PATH: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
        
        # Refresh current session's PATH
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + 
                   [Environment]::GetEnvironmentVariable("Path", "User")
        
        # Verify the repair
        $nodeVersion = & $nodeExe --version 2>$null
        if ($nodeVersion) {
            Write-Host "Successfully repaired Node.js installation: $nodeVersion" -ForegroundColor Green
            return $true
        }
        
        return $false
    } catch {
        Write-Host "Error during repair: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Modify the Initialize-NodeJsEnvironment function
function Initialize-NodeJsEnvironment {
    Write-Host "`nValidating Node.js environment..." -ForegroundColor Cyan
    
    $installations = Get-NodeInstallationDetails
    $defaultInstallPath = "C:\Program Files\nodejs"
    
    # Enhanced installation status report
    Write-Host "`nNode.js Installation Report:" -ForegroundColor Cyan
    Write-Host "------------------------" -ForegroundColor Cyan
    Write-Host "Installed: $($installations.Count -gt 0)" -ForegroundColor Yellow
    
    if (Test-Path $defaultInstallPath) {
        Write-Host "Default installation found at: $defaultInstallPath" -ForegroundColor Yellow
        
        # Attempt to repair partial installation first
        if (Repair-PartialNodeInstallation -existingPath $defaultInstallPath) {
            Write-Host "Successfully repaired existing installation" -ForegroundColor Green
            return $true
        }
    }
    
    # Check for admin privileges before attempting installation
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Host @"
Administrator privileges required!

Please run PowerShell as Administrator:
1. Right-click PowerShell
2. Select 'Run as Administrator'
3. Navigate to: $PWD
4. Run: .\scripts\bootstrap.ps1

"@ -ForegroundColor Yellow
        return $false
    }
    
    # Proceed with fresh installation if repair failed
    return Install-NodeJs
}

# Add this helper function
function Test-Command {
    param(
        [string]$command
    )
    
    try {
        if (Get-Command $command -ErrorAction Stop) {
            return $true
        }
    } catch {
        return $false
    }
}

# Main execution block
try {
    Write-Host "Initializing AI Development Pipeline setup..." -ForegroundColor Cyan
    Write-Host "Current directory: $PWD" -ForegroundColor Yellow

    # Validate script encodings
    $scriptsToCheck = @(
        (Join-Path $PSScriptRoot "nodejs-validation.ps1"),
        (Join-Path $PSScriptRoot "setup-environment.ps1"),
        $MyInvocation.MyCommand.Path
    )

    foreach ($script in $scriptsToCheck) {
        if (-not (Test-FileEncoding $script)) {
            Write-Host "Please ensure all script files use ASCII encoding" -ForegroundColor Yellow
        }
    }

    # Source Node.js validation script
    $nodeValidationScript = Join-Path $PSScriptRoot "nodejs-validation.ps1"
    if (-not (Test-Path $nodeValidationScript)) {
        throw "Node.js validation script not found at: $nodeValidationScript"
    }
    . $nodeValidationScript

    # Initialize Node.js environment
    $nodeInitialized = Initialize-NodeJsEnvironment
    if (-not $nodeInitialized) {
        Write-Host "Failed to initialize Node.js environment. Please follow the manual installation steps above." -ForegroundColor Red
        exit 1
    }

    # Collect system information
    $systemInfo = Get-SystemInfo
    Write-Host "`nCollected system information..." -ForegroundColor Green

    # Validate environment
    $envIssues = Test-Environment
    if ($envIssues.Count -gt 0) {
        Write-Host "`nEnvironment validation failed:" -ForegroundColor Red
        $envIssues | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
        exit 1
    }

    # Get project directory from command line or use current directory
    $projectDir = if ($args.Count -gt 0) { $args[0] } else { $PWD }
    
    # Normalize and validate project directory
    $projectDir = Get-NormalizedPath $projectDir
    Write-Host "Project directory: $projectDir" -ForegroundColor Yellow
    
    # Change to project directory
    if (-not (Set-LocationSafely $projectDir)) {
        throw "Failed to navigate to project directory"
    }
    
    # Find and validate project root
    $projectRoot = Find-ProjectRoot
    Write-Host "Project root found at: $projectRoot" -ForegroundColor Green
    
    # Change to project root
    if (-not (Set-LocationSafely $projectRoot)) {
        throw "Failed to navigate to project root"
    }

    # Generate AI context
    New-AIContext -projectRoot $projectRoot -systemInfo $systemInfo
    
    # Validate setup script exists
    $setupScript = Join-Path $projectRoot "scripts\setup-environment.ps1"
    if (-not (Test-Path $setupScript)) {
        throw "Setup script not found at: $setupScript"
    }
    
    # Run setup script
    Write-Host "`nRunning environment setup script..." -ForegroundColor Cyan
    & $setupScript

} catch {
    Write-Host "`nError during initialization:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host "`nTroubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "2. Try running: cd 'C:\Users\pvmal\ai_dev_pipeline' (use exact path)" -ForegroundColor Yellow
    Write-Host "3. Then run: .\scripts\bootstrap.ps1" -ForegroundColor Yellow
    Write-Host "4. If issues persist, run: Get-Location | Select-Object Path" -ForegroundColor Yellow
    Write-Host "5. Verify all required files are present: dir" -ForegroundColor Yellow
    
    exit 1
} 