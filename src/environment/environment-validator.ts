import { execSync } from 'child_process';
import * as os from 'os';
import chalk from 'chalk';
import { DevContextHelpers } from '../utils/dev-context-helpers';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
}

export class EnvironmentValidator {
  static async validateEnvironment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixes: []
    };

    try {
      // Check Node.js installation
      this.checkNodeInstallation(result);
      
      // Check npm installation
      this.checkNpmInstallation(result);
      
      // Check system requirements
      this.checkSystemRequirements(result);
      
      // Check for required global packages
      this.checkGlobalPackages(result);

      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Unexpected error during validation: ${error.message}`);
    }

    return result;
  }

  private static checkNodeInstallation(result: ValidationResult): void {
    try {
      const nodeVersion = execSync('node --version').toString().trim();
      const version = nodeVersion.replace('v', '');
      const [major] = version.split('.');
      
      if (parseInt(major) < 18) {
        result.errors.push('Node.js version must be 18 or higher');
        result.fixes.push('Download and install Node.js 18+ from https://nodejs.org/');
      }
    } catch {
      result.errors.push('Node.js is not installed or not in PATH');
      result.fixes.push('Download and install Node.js from https://nodejs.org/');
      if (os.platform() === 'win32') {
        result.fixes.push('Ensure Node.js is added to your system PATH');
        result.fixes.push('Try running the installer as administrator');
      }
    }
  }

  private static checkNpmInstallation(result: ValidationResult): void {
    try {
      const npmVersion = execSync('npm --version').toString().trim();
      const [major] = npmVersion.split('.');
      
      if (parseInt(major) < 9) {
        result.warnings.push('npm version should be 9 or higher');
        result.fixes.push('Run: npm install -g npm@latest');
      }
    } catch {
      result.errors.push('npm is not installed or not in PATH');
      result.fixes.push('npm should be installed with Node.js. Try reinstalling Node.js');
    }
  }

  private static checkSystemRequirements(result: ValidationResult): void {
    // Check available memory
    const totalMemGB = os.totalmem() / (1024 * 1024 * 1024);
    if (totalMemGB < 4) {
      result.warnings.push('System has less than 4GB RAM');
    }

    // Check OS compatibility
    const platform = os.platform();
    const supportedPlatforms = ['win32', 'darwin', 'linux'];
    if (!supportedPlatforms.includes(platform)) {
      result.warnings.push(`Operating system ${platform} might have limited support`);
    }
  }

  private static checkGlobalPackages(result: ValidationResult): void {
    try {
      // Check for TypeScript
      execSync('tsc --version');
    } catch {
      result.warnings.push('TypeScript is not installed globally');
      result.fixes.push('Run: npm install -g typescript');
    }
  }

  private static checkAdminRequirement(result: ValidationResult): void {
    try {
      const isAdmin = DevContextHelpers.checkAdminRights();
      if (!isAdmin) {
        result.warnings.push('Running without administrator privileges - some features may be limited');
      }
    } catch {
      result.warnings.push('Could not verify administrator privileges');
    }
  }

  static printValidationResult(result: ValidationResult): void {
    console.log('\nEnvironment Validation Results:');
    console.log('=============================');

    if (result.isValid) {
      console.log(chalk.green('✓ Environment is properly configured\n'));
    } else {
      console.log(chalk.red('✗ Environment needs attention\n'));
    }

    if (result.errors.length > 0) {
      console.log(chalk.red('Errors:'));
      result.errors.forEach(error => console.log(chalk.red(`  ✗ ${error}`)));
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('Warnings:'));
      result.warnings.forEach(warning => console.log(chalk.yellow(`  ! ${warning}`)));
      console.log();
    }

    if (result.fixes.length > 0) {
      console.log(chalk.cyan('Suggested Fixes:'));
      result.fixes.forEach(fix => console.log(chalk.cyan(`  > ${fix}`)));
      console.log();
    }
  }
} 