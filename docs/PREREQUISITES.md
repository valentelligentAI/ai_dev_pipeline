# Project Prerequisites

## System Requirements

### 1. Operating System
- Windows 10 or higher
- PowerShell 5.0+
- Administrator privileges
- 4GB RAM minimum

### 2. Node.js Environment
The setup script performs comprehensive Node.js validation:

#### Automatic Detection
```powershell
# The script checks these locations:
- C:\Program Files\nodejs
- C:\Program Files (x86)\nodejs
- %APPDATA%\Local\Programs\nodejs
- %LOCALAPPDATA%\Programs\nodejs
```

#### Installation States
1. **Not Installed**
   - Script will provide manual installation steps
   - Clear guidance for PATH configuration
   - Installation verification steps

2. **Partially Installed**
   - Automatic PATH repair attempt
   - Environment variable refresh
   - Installation validation

3. **Fully Installed**
   - Version verification
   - Global modules check
   - PATH validation

### 3. TypeScript Environment

#### Required Dependencies
```json
{
  "devDependencies": {
    "@types/node": "^18.11.17",
    "@typescript-eslint/parser": "^8.18.0",
    "@typescript-eslint/types": "^8.18.0",
    "typescript": "^4.9.4"
  }
}
```

#### Configuration Requirements
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "target": "ES2020",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

#### Validation Steps
1. Check TypeScript installation:
   ```bash
   tsc --version
   ```

2. Verify type definitions:
   ```bash
   npm ls @types/node @typescript-eslint/types
   ```

3. Test configuration:
   ```bash
   tsc --noEmit
   ```

### 4. Environment Validation

#### Automatic Checks
```powershell
# The script validates:
- File encoding (ASCII compatibility)
- System permissions
- Internet connectivity
- PATH configuration
- TypeScript setup
```

#### Manual Verification
If automatic validation fails:
1. Check Node.js installation:
   ```powershell
   node --version
   npm --version
   ```

2. Verify PATH:
   ```powershell
   $env:Path -split ';' | Where-Object { $_ -like '*node*' }
   ```

3. Check permissions:
   ```powershell
   # Should return True
   ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
   ```

### 5. Troubleshooting

#### Common Issues
1. **Encoding Problems**
   - Save all files as ASCII/UTF-8 without BOM
   - Avoid copy-pasting from web browsers
   - Use proper PowerShell string literals

2. **PATH Issues**
   - Restart PowerShell after PATH changes
   - Use absolute paths when possible
   - Verify system/user PATH separately

3. **Permission Issues**
   - Run PowerShell as Administrator
   - Check file system permissions
   - Verify npm global installation rights

4. **TypeScript Issues**
   - Module resolution errors
   - Missing type definitions
   - Configuration mismatches
   - Parser compatibility

#### Recovery Steps
1. Clean Installation:
   ```powershell
   # 1. Remove existing Node.js
   # 2. Clean PATH entries
   # 3. Restart PowerShell
   # 4. Run installer as admin
   ```

2. PATH Repair:
   ```powershell
   # Refresh environment
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

3. TypeScript Reset:
   ```bash
   # 1. Remove node_modules
   rm -rf node_modules
   # 2. Clear npm cache
   npm cache clean --force
   # 3. Reinstall dependencies
   npm install
   ```

4. Validation:
   ```powershell
   # Run setup script
   .\scripts\bootstrap.ps1
   ```

## Environment Validation

The system automatically generates two validation files:

### 1. .ai-context.json
Contains detailed environment information:
- System specifications
- Installed software versions
- Environment capabilities
- Project configuration
- TypeScript setup

### 2. AI_README.md
Human-readable summary including:
- Environment overview
- Project status
- System capabilities
- Important paths
- Type system status

## Post-Installation Verification

Run these commands to verify your setup:
```powershell
# 1. Check Node.js
node --version
npm --version

# 2. Verify TypeScript
tsc --version

# 3. Check environment context
Get-Content .ai-context.json
Get-Content AI_README.md

# 4. Validate type system
npm run validate-types
