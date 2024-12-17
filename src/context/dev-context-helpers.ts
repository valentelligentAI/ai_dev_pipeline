import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as https from 'https';

export interface ShellInfo {
  type: string;
  version: string;
  path: string;
}

export interface IDEInfo {
  name: string;
  version: string;
  extensions?: string[];
}

export class DevContextHelpers {
  static getTypeScriptVersion(): string {
    try {
      return execSync('tsc --version').toString().trim().replace('Version ', '');
    } catch {
      return 'not installed';
    }
  }

  static async detectShell(): Promise<ShellInfo> {
    const shell = process.env['SHELL'] || process.env['ComSpec'] || '';
    let type = 'unknown';
    let version = 'unknown';

    if (process.platform === 'win32') {
      if (shell.toLowerCase().includes('powershell')) {
        type = 'powershell';
        try {
          version = execSync('$PSVersionTable.PSVersion.ToString()').toString().trim();
        } catch {}
      } else {
        type = 'cmd';
        try {
          version = execSync('ver').toString().trim();
        } catch {}
      }
    } else {
      type = path.basename(shell);
      try {
        version = execSync(`${shell} --version`).toString().trim();
      } catch {}
    }

    return {
      type,
      version,
      path: shell
    };
  }

  static readPackageJson(): Record<string, unknown> {
    try {
      const content = fs.readFileSync('package.json', 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  static async collectTypeScriptInfo(): Promise<{ config: unknown; strict: boolean }> {
    try {
      const tsConfig = fs.readFileSync('tsconfig.json', 'utf8');
      const config = JSON.parse(tsConfig);
      return {
        config,
        strict: config.compilerOptions?.strict || false
      };
    } catch {
      return {
        config: null,
        strict: false
      };
    }
  }

  static async collectGitInfo(): Promise<{ initialized: boolean; remoteUrl?: string; branch?: string }> {
    try {
      const hasGit = fs.existsSync('.git');
      if (!hasGit) {
        return { initialized: false };
      }

      const remoteUrl = execSync('git remote get-url origin 2>/dev/null').toString().trim();
      const branch = execSync('git branch --show-current').toString().trim();

      return {
        initialized: true,
        remoteUrl,
        branch
      };
    } catch {
      return { initialized: false };
    }
  }

  static async detectIDE(): Promise<IDEInfo> {
    const vscodePath = '.vscode';
    const ideaPath = '.idea';
    
    if (fs.existsSync(vscodePath)) {
      const extensions = await this.getVSCodeExtensions();
      return {
        name: 'vscode',
        version: 'unknown',
        extensions
      };
    }

    if (fs.existsSync(ideaPath)) {
      return {
        name: 'intellij',
        version: 'unknown'
      };
    }

    return {
      name: 'unknown',
      version: 'unknown'
    };
  }

  static async getVSCodeExtensions(): Promise<string[]> {
    try {
      const extensionsJson = path.join('.vscode', 'extensions.json');
      if (fs.existsSync(extensionsJson)) {
        const content = fs.readFileSync(extensionsJson, 'utf8');
        const { recommendations = [] } = JSON.parse(content);
        return recommendations;
      }
    } catch {}
    return [];
  }

  static async checkGlobalInstallRights(): Promise<boolean> {
    try {
      const testPath = path.join(process.env['npm_config_prefix'] || '', 'test-write');
      fs.writeFileSync(testPath, '');
      fs.unlinkSync(testPath);
      return true;
    } catch {
      return false;
    }
  }

  static async checkAdminRights(): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        execSync('net session', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    } else {
      return process.getuid?.() === 0 || false;
    }
  }

  static async checkInternetAccess(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = https.get('https://www.google.com', () => resolve(true));
      req.on('error', () => resolve(false));
      req.end();
    });
  }

  static async checkGitAccess(): Promise<boolean> {
    try {
      execSync('git --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  static async checkDiskSpace(): Promise<number> {
    const root = process.platform === 'win32' ? process.cwd().split(path.sep)[0] : '/';
    try {
      const stats = fs.statfsSync(root);
      return stats.bfree * stats.bsize;
    } catch {
      return -1;
    }
  }

  static async readEditorConfig(): Promise<{ indentStyle: string; indentSize: number; lineEnding: string }> {
    const defaults = {
      indentStyle: 'spaces',
      indentSize: 2,
      lineEnding: 'LF'
    };

    try {
      const editorConfigPath = '.editorconfig';
      if (!fs.existsSync(editorConfigPath)) {
        return defaults;
      }

      const content = fs.readFileSync(editorConfigPath, 'utf8');
      const config: Record<string, string> = {};

      content.split('\n').forEach(line => {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key && value) {
          config[key] = value;
        }
      });

      return {
        indentStyle: config.indent_style || defaults.indentStyle,
        indentSize: parseInt(config.indent_size) || defaults.indentSize,
        lineEnding: config.end_of_line || defaults.lineEnding
      };
    } catch {
      return defaults;
    }
  }

  static detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    return 'npm';
  }

  static detectTestFramework(): 'jest' | 'mocha' | 'other' {
    const pkg = this.readPackageJson();
    if (pkg.dependencies?.jest || pkg.devDependencies?.jest) return 'jest';
    if (pkg.dependencies?.mocha || pkg.devDependencies?.mocha) return 'mocha';
    return 'other';
  }

  static detectLinter(): 'eslint' | 'other' {
    if (fs.existsSync('.eslintrc') || fs.existsSync('.eslintrc.js') || fs.existsSync('.eslintrc.json')) {
      return 'eslint';
    }
    return 'other';
  }

  static detectFormatter(): 'prettier' | 'other' {
    if (fs.existsSync('.prettierrc') || fs.existsSync('.prettierrc.js') || fs.existsSync('.prettierrc.json')) {
      return 'prettier';
    }
    return 'other';
  }

  static async detectNodeVersion(): Promise<string> {
    try {
      return execSync('node --version').toString().trim();
    } catch {
      return 'not installed';
    }
  }

  static async detectNpmVersion(): Promise<string> {
    try {
      return execSync('npm --version').toString().trim();
    } catch {
      return 'not installed';
    }
  }

  static async detectTypeScriptVersion(): Promise<string> {
    try {
      return execSync('tsc --version').toString().trim().replace('Version ', '');
    } catch {
      return 'not installed';
    }
  }

  static async validateSystemRequirements(): Promise<boolean> {
    const nodeVersion = await this.detectNodeVersion();
    const npmVersion = await this.detectNpmVersion();
    const tsVersion = await this.detectTypeScriptVersion();
    
    return nodeVersion !== 'not installed' && 
           npmVersion !== 'not installed' && 
           tsVersion !== 'not installed';
  }

  static async handleUnknown(_value: unknown): Promise<unknown> {
    return null;
  }
} 