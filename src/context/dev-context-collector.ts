import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { 
  DevContext, 
  EnvironmentInfo, 
  ProjectInfo, 
  DeveloperCapabilities, 
  DeveloperPreferences 
} from './types';

export class DevContextCollector {
  static async collect(): Promise<DevContext> {
    const context: DevContext = {
      environment: await this.collectEnvironmentInfo(),
      project: await this.collectProjectInfo(),
      capabilities: await this.collectCapabilities(),
      preferences: await this.collectPreferences()
    };

    // Save context for AI reference
    await this.saveContext(context);
    return context;
  }

  private static async collectEnvironmentInfo(): Promise<EnvironmentInfo> {
    return {
      nodeVersion: process.version,
      npmVersion: execSync('npm --version').toString().trim(),
      typeScriptVersion: this.getTypeScriptVersion(),
      os: {
        platform: process.platform,
        release: process.release.name,
        arch: process.arch
      },
      shell: await this.detectShell()
    };
  }

  private static async collectProjectInfo(): Promise<ProjectInfo> {
    const packageJson = this.readPackageJson();
    return {
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      scripts: packageJson.scripts || {},
      typescript: await this.collectTypeScriptInfo(),
      git: await this.collectGitInfo(),
      ide: await this.detectIDE()
    };
  }

  private static async collectCapabilities(): Promise<DeveloperCapabilities> {
    return {
      canInstallGlobally: await this.checkGlobalInstallRights(),
      hasAdminRights: await this.checkAdminRights(),
      hasInternetAccess: await this.checkInternetAccess(),
      hasGitAccess: await this.checkGitAccess(),
      availableMemory: process.memoryUsage().heapTotal,
      availableDiskSpace: await this.checkDiskSpace()
    };
  }

  private static async collectPreferences(): Promise<DeveloperPreferences> {
    const editorConfig = await this.readEditorConfig();
    return {
      indentStyle: editorConfig.indentStyle || 'spaces',
      indentSize: editorConfig.indentSize || 2,
      lineEnding: editorConfig.lineEnding || 'LF',
      packageManager: this.detectPackageManager(),
      testFramework: this.detectTestFramework(),
      linter: this.detectLinter(),
      formatter: this.detectFormatter()
    };
  }

  private static async saveContext(context: DevContext): Promise<void> {
    const contextPath = path.join(process.cwd(), '.ai-context.json');
    await fs.promises.writeFile(
      contextPath,
      JSON.stringify(context, null, 2),
      'utf8'
    );

    // Generate AI-specific documentation
    await this.generateAIReadme(context);
  }

  private static async generateAIReadme(context: DevContext): Promise<void> {
    const aiReadme = `# AI Development Context

## Environment Overview
- Node.js: ${context.environment.nodeVersion}
- TypeScript: ${context.environment.typeScriptVersion}
- OS: ${context.environment.os.platform} (${context.environment.os.arch})

## Project Capabilities
- Global Install Rights: ${context.capabilities.canInstallGlobally}
- Admin Access: ${context.capabilities.hasAdminRights}
- Internet Access: ${context.capabilities.hasInternetAccess}

## Development Preferences
- Indent Style: ${context.preferences.indentStyle}
- Package Manager: ${context.preferences.packageManager}
- Test Framework: ${context.preferences.testFramework}

## Critical Information for AI
1. Environment Constraints
   - ${this.generateConstraintsSection(context)}

2. Available Tools
   - ${this.generateToolsSection(context)}

3. Recommended Practices
   - ${this.generatePracticesSection(context)}

4. Known Limitations
   - ${this.generateLimitationsSection(context)}

This context was automatically generated to optimize AI-developer collaboration.
`;

    await fs.promises.writeFile(
      path.join(process.cwd(), 'AI_README.md'),
      aiReadme,
      'utf8'
    );
  }

  private static generateConstraintsSection(context: DevContext): string {
    const constraints = [];
    if (!context.capabilities.canInstallGlobally) {
      constraints.push('No global installation rights - use local dependencies');
    }
    if (!context.capabilities.hasAdminRights) {
      constraints.push('Limited system access - avoid admin-required operations');
    }
    return constraints.join('\n   - ');
  }

  private static generateToolsSection(context: DevContext): string {
    return Object.keys(context.project.dependencies)
      .concat(Object.keys(context.project.devDependencies))
      .join('\n   - ');
  }

  private static generatePracticesSection(context: DevContext): string {
    const practices = [
      `Use ${context.preferences.indentStyle} for indentation`,
      `Follow ${context.preferences.linter} rules`,
      `Use ${context.preferences.packageManager} for dependency management`
    ];
    return practices.join('\n   - ');
  }

  private static generateLimitationsSection(context: DevContext): string {
    const limitations = [];
    if (context.environment.os.platform === 'win32') {
      limitations.push('Windows-specific path handling required');
    }
    if (!context.capabilities.hasGitAccess) {
      limitations.push('Limited version control capabilities');
    }
    return limitations.join('\n   - ');
  }

  // ... (implementation of helper methods)
} 