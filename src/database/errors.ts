// Define error interface following project patterns
export interface DatabaseErrorDetails {
    code: string;
    message: string;
    severity: 'error' | 'warning';
}

// Custom error class with proper typing
export class DatabaseError extends Error implements DatabaseErrorDetails {
    public readonly severity: 'error' | 'warning';

    constructor(
        message: string,
        public readonly code: string,
        severity: 'error' | 'warning' = 'error'
    ) {
        super(message);
        this.name = 'DatabaseError';
        this.severity = severity;
        // Restore prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
