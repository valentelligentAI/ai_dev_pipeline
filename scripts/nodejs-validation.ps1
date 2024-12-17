# Function to comprehensively check Node.js installation
function Test-NodeJsInstallation {
    param (
        [switch]$Verbose
    )
    
    $results = @{
        IsInstalled = $false
        Version = $null
        Path = $null
        InPath = $false
        GlobalModules = @()
        InstallLocations = @()
        Errors = @()
    }

    # Check common installation paths
    $possiblePaths = @(
        "$env:ProgramFiles\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "$env:APPDATA\Local\Programs\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Node.js",
        # Add Program Files paths that might be linked from Start Menu
        "C:\Program Files\nodejs",
        "C:\Program Files (x86)\nodejs"
    )

    # First check if Node.js is in Start Menu (indicates installation)
    $startMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Node.js"
    if (Test-Path $startMenuPath) {
        $results.InstallLocations += $startMenuPath
        $results.IsInstalled = $true  # Installation confirmed via Start Menu
        
        if ($Verbose) {
            Write-Host "Node.js installation found in Start Menu" -ForegroundColor Green
        }
    }

    # Check other possible installation paths
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $results.InstallLocations += $path
            
            # Look for node.exe in this path
            if (Test-Path "$path\node.exe") {
                $results.Path = "$path\node.exe"
            }
        }
    }

    # Check PATH environment variable
    try {
        $nodePath = Get-Command node -ErrorAction SilentlyContinue
        if ($nodePath) {
            $results.InPath = $true
            $results.Path = $nodePath.Source
            
            # Get version information
            $nodeVersion = & node --version 2>&1
            if ($nodeVersion -match 'v\d+\.\d+\.\d+') {
                $results.Version = $nodeVersion
                $results.IsInstalled = $true
            }
        }
        else {
            # Additional PATH verification
            $envPaths = $env:Path -split ';'
            foreach ($path in $results.InstallLocations) {
                if ($envPaths -contains $path) {
                    $results.InPath = $true
                    break
                }
            }
        }
    } catch {
        $results.Errors += "Error checking node command: $($_.Exception.Message)"
    }

    # If installed but not in PATH, this is a critical issue
    if ($results.IsInstalled -and -not $results.InPath) {
        $results.Errors += "Node.js is installed but not properly added to PATH"
    }

    # Verbose output
    if ($Verbose) {
        Write-Host "`nNode.js Installation Report:" -ForegroundColor Cyan
        Write-Host "------------------------" -ForegroundColor Cyan
        
        $installedColor = if ($results.IsInstalled) { 'Green' } else { 'Red' }
        $pathColor = if ($results.InPath) { 'Green' } else { 'Red' }
        
        Write-Host "Installed: $($results.IsInstalled)" -ForegroundColor $installedColor
        Write-Host "Version: $($results.Version)" -ForegroundColor Yellow
        Write-Host "In PATH: $($results.InPath)" -ForegroundColor $pathColor
        Write-Host "Installation Path: $($results.Path)" -ForegroundColor Yellow
        
        Write-Host "`nFound Installation Locations:" -ForegroundColor Cyan
        foreach ($location in $results.InstallLocations) {
            Write-Host "- $location" -ForegroundColor Yellow
        }

        if ($results.Errors.Count -gt 0) {
            Write-Host "`nCritical Issues:" -ForegroundColor Red
            foreach ($error in $results.Errors) {
                Write-Host "- $error" -ForegroundColor Red
            }
            
            if ($results.IsInstalled -and -not $results.InPath) {
                Write-Host "`nRecommended Fix:" -ForegroundColor Yellow
                Write-Host "1. Open System Properties > Advanced > Environment Variables" -ForegroundColor Yellow
                Write-Host "2. Edit the System 'Path' variable" -ForegroundColor Yellow
                Write-Host "3. Add the Node.js installation directory (likely in Program Files)" -ForegroundColor Yellow
                Write-Host "4. Restart your terminal/IDE" -ForegroundColor Yellow
            }
        }
    }

    return $results
}

# Function to fix common Node.js PATH issues
function Repair-NodeJsPath {
    param (
        [hashtable]$nodeInfo
    )

    $fixed = $false
    $messages = @()

    if ($nodeInfo.IsInstalled -and -not $nodeInfo.InPath) {
        foreach ($location in $nodeInfo.InstallLocations) {
            if (Test-Path $location) {
                try {
                    $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
                    if (-not $currentPath.Contains($location)) {
                        $newPath = "$currentPath;$location"
                        [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine')
                        $messages += "Added Node.js location to system PATH: $location"
                        $fixed = $true
                    }
                } catch {
                    $messages += "Failed to update PATH: $($_.Exception.Message)"
                }
            }
        }
    }

    return @{
        Fixed = $fixed
        Messages = $messages
    }
}

# Function to integrate with bootstrap script
function Initialize-NodeJsEnvironment {
    Write-Host "Validating Node.js installation..." -ForegroundColor Cyan
    
    $nodeStatus = Test-NodeJsInstallation -Verbose
    
    if (-not $nodeStatus.IsInstalled) {
        Write-Host "Node.js not detected. Checking for partial installations..." -ForegroundColor Yellow
        
        if ($nodeStatus.InstallLocations.Count -gt 0) {
            Write-Host "Found Node.js installations. Attempting to repair PATH..." -ForegroundColor Yellow
            $repairResult = Repair-NodeJsPath -nodeInfo $nodeStatus
            
            if ($repairResult.Fixed) {
                Write-Host "Successfully repaired Node.js configuration:" -ForegroundColor Green
                foreach ($msg in $repairResult.Messages) {
                    Write-Host "- $msg" -ForegroundColor Green
                }
                
                $env:Path = [Environment]::GetEnvironmentVariable('PATH', 'Machine') + ";" + [Environment]::GetEnvironmentVariable('PATH', 'User')
                $nodeStatus = Test-NodeJsInstallation
            }
        }
        
        if (-not $nodeStatus.IsInstalled) {
            Write-Host "`nNode.js installation requires attention:" -ForegroundColor Red
            Write-Host "1. Download Node.js from https://nodejs.org/" -ForegroundColor Yellow
            Write-Host "2. Run installer with administrator privileges" -ForegroundColor Yellow
            Write-Host "3. Ensure 'Add to PATH' is selected during installation" -ForegroundColor Yellow
            Write-Host "4. Restart your terminal after installation" -ForegroundColor Yellow
            return $false
        }
    }
    
    Write-Host "Node.js is properly configured:" -ForegroundColor Green
    Write-Host "- Version: $($nodeStatus.Version)" -ForegroundColor Green
    Write-Host "- Path: $($nodeStatus.Path)" -ForegroundColor Green
    return $true
} 