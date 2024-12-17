/**
 * Core types for the AI-Paired Programming metadata layer
 */

export interface ProjectMetadata {
  context: ProjectContext;
  history: DecisionHistory;
  metrics: ProjectMetrics;
  validation: ValidationState;
  learning: LearningState;
}

export interface ProjectContext {
  name: string;
  description: string;
  goals: {
    primary: string;
    secondary: string[];
    constraints: string[];
  };
  environment: {
    technical: TechnicalRequirements;
    business: BusinessConstraints;
    user: UserCapabilities;
  };
  stage: DevelopmentStage;
}

  export interface TechnicalRequirements {
    stack: string[];
    dependencies: Dependency[];
    infrastructure: InfrastructureRequirement[];
    security: SecurityRequirement[];
}

export interface BusinessConstraints {
  timeline: string;
  budget: string;
  priorities: string[];
  stakeholders: string[];
}

export interface UserCapabilities {
  technicalLevel: TechnicalLevel;
  domainExpertise: string[];
  preferredCommunicationStyle: CommunicationStyle;
}

export interface DecisionHistory {
  decisions: Decision[];
  patterns: Pattern[];
  lessons: Lesson[];
}

export interface Decision {
  id: string;
  timestamp: string;
  context: string;
  options: Alternative[];
  selected: string;
  reasoning: string;
  impact: Impact;
  complexity: Complexity;
  learningOpportunities: string[];
}

export interface Alternative {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  complexity: Complexity;
  risk: Risk;
}

export interface ProjectMetrics {
  userExperience: UXMetrics;
  codeQuality: CodeQualityMetrics;
  projectHealth: ProjectHealthMetrics;
  learningEffectiveness: LearningMetrics;
}

export interface ValidationState {
  lastCheck: string;
  checkpoints: Checkpoint[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

export enum DevelopmentStage {
  Planning = 'planning',
  Implementation = 'implementation',
  Testing = 'testing',
  Review = 'review',
  Maintenance = 'maintenance'
}

export enum TechnicalLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced'
}

export enum CommunicationStyle {
  Technical = 'technical',
  BusinessFocused = 'business_focused',
  Simplified = 'simplified'
}

export enum Complexity {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export enum Risk {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export interface Impact {
  scope: string[];
  effort: string;
  risks: Risk[];
  benefits: string[];
  complexityIncrease: number;
  learningCurve: Complexity;
}

export interface LearningState {
  concepts: Concept[];
  resources: Resource[];
  validations: ValidationPoint[];
  progress: LearningProgress;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  difficulty: Complexity;
  prerequisites: string[];
  resources: Resource[];
  validations: ValidationPoint[];
}

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  description: string;
  concepts: string[];
  difficulty: Complexity;
}

export interface ValidationPoint {
  id: string;
  type: ValidationType;
  concept: string;
  question: string;
  expectedResponse: string;
  hints: string[];
  completed: boolean;
  timestamp?: string;
}

export interface LearningProgress {
  completedConcepts: string[];
  validationResults: ValidationResult[];
  currentLevel: TechnicalLevel;
  strengths: string[];
  areasForImprovement: string[];
}

export interface ValidationResult {
  id: string;
  validationId: string;
  success: boolean;
  timestamp: string;
  attempts: number;
  notes: string;
}

export enum ResourceType {
  Documentation = 'documentation',
  Tutorial = 'tutorial',
  Example = 'example',
  Exercise = 'exercise',
  Reference = 'reference'
}

export enum ValidationType {
  MultipleChoice = 'multiple_choice',
  CodeImplementation = 'code_implementation',
  Explanation = 'explanation',
  ProblemSolving = 'problem_solving'
}

export interface LearningMetrics {
  conceptUnderstanding: number;
  independentProblemSolving: number;
  knowledgeRetention: number;
  progressionRate: number;
}

export interface SystemContext {
    timestamp: string;
    system: {
        os: string;
        architecture: string;
        processorCount: number;
        powerShell: string;
        systemDirectory: string;
        environmentVariables: Record<string, string>;
        installation: {
            nodeVersion: string;
            npmVersion: string;
            installPath: string;
            inPath: boolean;
            installationLocations: string[];
            lastValidated: string;
            validationHistory: {
                timestamp: string;
                success: boolean;
                errors: string[];
                fixes: string[];
            }[];
        };
    };
    project: {
        root: string;
        hasGit: boolean;
        hasTsConfig: boolean;
        hasPackageJson: boolean;
    };
    capabilities: {
        isAdmin: boolean;
        hasInternet: boolean;
        canWriteToUserProfile: boolean;
    };
}

export interface UXMetrics {
  satisfaction: number;
  comprehension: number;
  timeToComplete: number;
}

export interface CodeQualityMetrics {
  complexity: {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    maintainabilityIndex: number;
  };
  coverage: {
    lines: number;
    functions: number;
    branches: number;
  };
  duplication: {
    percentage: number;
    locations: string[];
  };
  standards: {
    lintingErrors: number;
    typeErrors: number;
    conventionViolations: number;
  };
  documentation: {
    coverage: number;
    quality: number;
  };
}

export interface ProjectHealthMetrics {
  buildStatus: {
    success: boolean;
    duration: number;
    failureCount: number;
    lastBuild: string;
  };
  dependencies: {
    outdated: number;
    vulnerable: number;
    total: number;
  };
  performance: {
    buildTime: number;
    testExecutionTime: number;
    memoryUsage: number;
  };
  activity: {
    commitFrequency: number;
    issueResolutionRate: number;
    contributorCount: number;
  };
  stability: {
    crashRate: number;
    errorRate: number;
    uptime: number;
  };
}

export interface Checkpoint {
  id: string;
  name: string;
  category: CheckpointCategory;
  status: CheckpointStatus;
  lastChecked: string;
  criteria: string[];
  results: CheckpointResult[];
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: string;
  message: string;
  timestamp: string;
  context: string;
  relatedCheckpoints: string[];
  resolution?: string;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: Priority;
  description: string;
  rationale: string;
  impact: Impact;
  implementation: {
    steps: string[];
    effort: Complexity;
    prerequisites: string[];
  };
  status: RecommendationStatus;
}

export enum CheckpointCategory {
  Security = 'security',
  Performance = 'performance',
  Quality = 'quality',
  Compliance = 'compliance',
  Architecture = 'architecture'
}

export enum CheckpointStatus {
  Passed = 'passed',
  Failed = 'failed',
  Warning = 'warning',
  Pending = 'pending'
}

export interface CheckpointResult {
  timestamp: string;
  status: CheckpointStatus;
  details: string;
  metrics?: Record<string, number>;
}

export enum AlertSeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info'
}

export enum RecommendationType {
  Performance = 'performance',
  Security = 'security',
  Quality = 'quality',
  Learning = 'learning',
  Process = 'process'
}

export enum RecommendationStatus {
  New = 'new',
  InProgress = 'in_progress',
  Completed = 'completed',
  Dismissed = 'dismissed'
}

export enum Priority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

export interface Lesson {
  id: string;
  topic: string;
  description: string;
  context: string;
  learningPoints: string[];
  relatedDecisions: string[];
  timestamp: string;
  impact: Impact;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  context: string;
  applicability: string[];
  consequences: string[];
  examples: string[];
  relatedPatterns: string[];
}

export interface Dependency {
  name: string;
  version: string;
  type: DependencyType;
  required: boolean;
  purpose: string;
  constraints?: string[];
  vulnerabilities?: {
    severity: AlertSeverity;
    description: string;
    mitigation?: string;
  }[];
}

export interface InfrastructureRequirement {
  type: InfrastructureType;
  description: string;
  specifications: {
    minimum: ResourceSpecification;
    recommended: ResourceSpecification;
  };
  scalability: ScalabilityRequirement;
  availability: string;
  compliance?: string[];
}

export interface SecurityRequirement {
  category: SecurityCategory;
  description: string;
  level: SecurityLevel;
  compliance: string[];
  controls: SecurityControl[];
  validation: SecurityValidation[];
}

export enum DependencyType {
  Runtime = 'runtime',
  Development = 'development',
  Peer = 'peer',
  Optional = 'optional'
}

export enum InfrastructureType {
  Compute = 'compute',
  Storage = 'storage',
  Network = 'network',
  Database = 'database',
  Cache = 'cache',
  Messaging = 'messaging'
}

export interface ResourceSpecification {
  cpu: string;
  memory: string;
  storage: string;
  network?: string;
}

export interface ScalabilityRequirement {
  type: ScalabilityType;
  metrics: {
    minInstances: number;
    maxInstances: number;
    targetUtilization: number;
  };
}

export enum ScalabilityType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Both = 'both'
}

export enum SecurityLevel {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

export enum SecurityCategory {
  Authentication = 'authentication',
  Authorization = 'authorization',
  DataProtection = 'data_protection',
  NetworkSecurity = 'network_security',
  Compliance = 'compliance'
}

export interface SecurityControl {
  name: string;
  description: string;
  implementation: string;
  verification: string[];
}

export interface SecurityValidation {
  type: SecurityValidationType;
  frequency: string;
  criteria: string[];
  tools?: string[];
}

export enum SecurityValidationType {
  Audit = 'audit',
  Penetration = 'penetration',
  Compliance = 'compliance',
  Monitoring = 'monitoring'
}