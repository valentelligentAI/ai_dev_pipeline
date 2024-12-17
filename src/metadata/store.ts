import { ProjectMetadata, Decision, DevelopmentStage, TechnicalLevel, CommunicationStyle, Concept, Resource, ValidationPoint, TechnicalRequirements, UserCapabilities, Alert as AlertType, Checkpoint as CheckpointType, AlertSeverity } from './types';

interface Alert {
  type: 'complexity' | 'performance' | 'security' | 'maintenance';
  message: string;
  suggestions?: string[];
}

/**
 * MetadataStore manages the project's metadata state and provides methods
 * for updating and querying the metadata.
 */
export class MetadataStore {
  private metadata: ProjectMetadata;
  private static instance: MetadataStore;
  private complexityThreshold: number = 0.7; // 70% threshold tracking

  private constructor() {
    this.metadata = this.initializeMetadata();
  }

  /**
   * Get the singleton instance of MetadataStore
   */
  public static getInstance(): MetadataStore {
    if (!MetadataStore.instance) {
      MetadataStore.instance = new MetadataStore();
    }
    return MetadataStore.instance;
  }

  /**
   * Initialize default metadata state
   */
  private initializeMetadata(): ProjectMetadata {
    return {
      context: {
        name: 'AI Development Pipeline',
        description: 'AI-paired programming pipeline for streamlined development',
        goals: {
          primary: 'Create an efficient AI-paired programming experience',
          secondary: [],
          constraints: [],
        },
        environment: {
          technical: {
            stack: ['React', 'TypeScript', 'Node.js'],
            dependencies: [],
            infrastructure: [],
            security: [],
          },
          business: {
            timeline: 'Ongoing',
            budget: 'Not specified',
            priorities: ['User Experience', 'Code Quality', 'Documentation'],
            stakeholders: ['Developers', 'Users'],
          },
          user: {
            technicalLevel: TechnicalLevel.Beginner,
            domainExpertise: [],
            preferredCommunicationStyle: CommunicationStyle.Simplified,
          },
        },
        stage: DevelopmentStage.Planning,
      },
      history: {
        decisions: [],
        patterns: [],
        lessons: [],
      },
      metrics: {
        userExperience: {
          satisfaction: 0,
          comprehension: 0,
          timeToComplete: 0,
        },
        codeQuality: {
          complexity: {
            cyclomaticComplexity: 0,
            cognitiveComplexity: 0,
            maintainabilityIndex: 0,
          },
          coverage: {
            lines: 0,
            functions: 0,
            branches: 0,
          },
          duplication: {
            percentage: 0,
            locations: [],
          },
          standards: {
            lintingErrors: 0,
            typeErrors: 0,
            conventionViolations: 0,
          },
          documentation: {
            coverage: 0,
            quality: 0,
          },
        },
        projectHealth: {
          buildStatus: {
            success: false,
            duration: 0,
            failureCount: 0,
            lastBuild: new Date().toISOString(),
          },
          dependencies: {
            outdated: 0,
            vulnerable: 0,
            total: 0,
          },
          performance: {
            buildTime: 0,
            testExecutionTime: 0,
            memoryUsage: 0,
          },
          activity: {
            commitFrequency: 0,
            issueResolutionRate: 0,
            contributorCount: 0,
          },
          stability: {
            crashRate: 0,
            errorRate: 0,
            uptime: 0,
          },
        },
        learningEffectiveness: {
          conceptUnderstanding: 0,
          independentProblemSolving: 0,
          knowledgeRetention: 0,
          progressionRate: 0,
        }
      },
      validation: {
        lastCheck: new Date().toISOString(),
        checkpoints: [],
        alerts: [],
        recommendations: [],
      },
      learning: {
        concepts: [],
        resources: [],
        validations: [],
        progress: {
          completedConcepts: [],
          validationResults: [],
          currentLevel: TechnicalLevel.Beginner,
          strengths: [],
          areasForImprovement: []
        }
      }
    };
  }

  /**
   * Track complexity and provide warnings when approaching 70% threshold
   */
  private trackComplexity(_decision: Decision): void {
    const currentComplexity = this.calculateCurrentComplexity();
    if (currentComplexity > this.complexityThreshold) {
      this.addAlert({
        type: 'complexity',
        message: 'Approaching 70% complexity threshold. Consider reviewing and simplifying.',
        suggestions: this.generateSimplificationSuggestions()
      });
    }
  }

  /**
   * Calculate current project complexity
   */
  private calculateCurrentComplexity(): number {
    // Implementation to calculate complexity based on:
    // - Number of dependencies
    // - Code complexity metrics
    // - Integration points
    // - Learning curve
    return 0; // Placeholder
  }

  /**
   * Generate suggestions for simplification
   */
  private generateSimplificationSuggestions(): string[] {
    return [
      'Review and document current implementation',
      'Break down complex components',
      'Add test coverage',
      'Validate understanding of core concepts'
    ];
  }

  /**
   * Record a new decision with complexity tracking
   */
  public recordDecision(decision: Decision): void {
    this.metadata.history.decisions.push(decision);
    this.trackComplexity(decision);
  }

  /**
   * Add a learning concept
   */
  public addConcept(concept: Concept): void {
    this.metadata.learning.concepts.push(concept);
  }

  /**
   * Add a learning resource
   */
  public addResource(resource: Resource): void {
    this.metadata.learning.resources.push(resource);
  }

  /**
   * Record validation point completion
   */
  public completeValidation(validation: ValidationPoint): void {
    const result = {
      id: `result-${Date.now()}`,
      validationId: validation.id,
      success: true,
      timestamp: new Date().toISOString(),
      attempts: 1,
      notes: ''
    };
    this.metadata.learning.progress.validationResults.push(result);
  }

  /**
   * Update learning progress
   */
  public updateLearningProgress(conceptId: string): void {
    if (!this.metadata.learning.progress.completedConcepts.includes(conceptId)) {
      this.metadata.learning.progress.completedConcepts.push(conceptId);
      this.reassessTechnicalLevel();
    }
  }

  /**
   * Reassess user's technical level based on progress
   */
  private reassessTechnicalLevel(): void {
    const progress = this.calculateLearningProgress();
    if (progress > 0.8) {
      this.metadata.context.environment.user.technicalLevel = TechnicalLevel.Advanced;
    } else if (progress > 0.4) {
      this.metadata.context.environment.user.technicalLevel = TechnicalLevel.Intermediate;
    }
  }

  /**
   * Calculate learning progress
   */
  private calculateLearningProgress(): number {
    const completed = this.metadata.learning.progress.completedConcepts.length;
    const total = this.metadata.learning.concepts.length;
    return total > 0 ? completed / total : 0;
  }

  /**
   * Add an alert to the validation state
   */
  private addAlert(alert: Alert): void {
    const newAlert: AlertType = {
      id: `alert-${Date.now()}`,
      severity: AlertSeverity.Medium,
      category: 'validation',
      message: alert.message,
      timestamp: new Date().toISOString(),
      context: 'metadata',
      relatedCheckpoints: [],
    };
    this.metadata.validation.alerts.push(newAlert);
  }

  /**
   * Update the project's development stage
   */
  public updateStage(stage: DevelopmentStage): void {
    this.metadata.context.stage = stage;
  }

  /**
   * Get the current project metadata state
   */
  public getMetadata(): ProjectMetadata {
    return { ...this.metadata };
  }

  /**
   * Update user capabilities
   */
  public updateUserCapabilities(capabilities: UserCapabilities): void {
    this.metadata.context.environment.user = {
      ...this.metadata.context.environment.user,
      ...capabilities
    };
  }

  /**
   * Add a new validation checkpoint
   */
  public addCheckpoint(checkpoint: CheckpointType): void {
    this.metadata.validation.checkpoints.push(checkpoint);
    this.metadata.validation.lastCheck = new Date().toISOString();
  }

  /**
   * Update project metrics
   */
  public updateMetrics(metrics: Partial<ProjectMetadata['metrics']>): void {
    this.metadata.metrics = {
      ...this.metadata.metrics,
      ...metrics,
    };
  }

  /**
   * Update technical environment information
   */
  public async updateEnvironment(technicalEnv: TechnicalRequirements): Promise<void> {
    this.metadata.context.environment.technical = {
      ...this.metadata.context.environment.technical,
      ...technicalEnv
    };
  }
}
