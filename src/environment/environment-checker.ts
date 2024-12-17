import { execSync } from 'child_process';
import * as os from 'os';

interface EnvironmentInfo {
  nodeVersion: string;
  npmVersion: string;
  gitVersion: string;
  os: {
    platform: string;
    release: string;
    arch: string;
  };
  memory: {
    total: number;
    free: number;
  };
}

export class EnvironmentChecker {
  static async checkEnvironment(): Promise<EnvironmentInfo> {
    try {
      const nodeVersion = process.version;
      const npmVersion = execSync('npm --version').toString().trim();
      const gitVersion = execSync('git --version').toString().trim();

      return {
        nodeVersion,
        npmVersion,
        gitVersion,
        os: {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch()
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem()
        }
      };
    } catch (error) {
      throw new Error(`Failed to check environment: ${error.message}`);
    }
  }

  static validateRequirements(info: EnvironmentInfo): string[] {
    const issues: string[] = [];
    
    // Check Node.js version
    const nodeVersion = info.nodeVersion.replace('v', '');
    if (!this.satisfiesVersion(nodeVersion, '18.0.0')) {
      issues.push('Node.js version must be 18.0.0 or higher');
    }

    // Check available memory (minimum 4GB)
    const minMemoryGB = 4;
    const totalMemoryGB = info.memory.total / (1024 * 1024 * 1024);
    if (totalMemoryGB < minMemoryGB) {
      issues.push(`System requires at least ${minMemoryGB}GB of RAM`);
    }

    return issues;
  }

  private static satisfiesVersion(current: string, required: string): boolean {
    const [currentMajor] = current.split('.');
    const [requiredMajor] = required.split('.');
    return parseInt(currentMajor) >= parseInt(requiredMajor);
  }
} 