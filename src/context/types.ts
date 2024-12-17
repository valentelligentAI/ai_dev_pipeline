export interface SystemContext {
    OS: string;
    Architecture: string;
    Environment: string;
    ProcessorCount: number;
    PowerShell: string;
    SystemDirectory: string;
    EnvironmentVariables: Record<string, string>;
    UserName: string;
    ComputerName: string;
    WorkingDirectory: string;
}

export interface ProjectContext {
    name: string;
    version: string;
    description: string;
    repository: string;
}

export interface Capabilities {
    database: boolean;
    fileSystem: boolean;
    networking: boolean;
}

export interface AIContext {
    system: SystemContext;
    project: ProjectContext;
    capabilities: Capabilities;
}
