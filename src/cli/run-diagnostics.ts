#!/usr/bin/env node
import { resolve } from 'path';
import { TypeScriptDiagnostics } from '../utils/typescript-diagnostics';

async function main(): Promise<void> {
  try {
    const configPath = resolve(process.cwd(), 'tsconfig.json');
    const diagnostics = new TypeScriptDiagnostics(configPath);
    
    console.log('Analyzing TypeScript codebase...');
    const results = diagnostics.analyzeCodebase();
    
    // Generate report
    const reportPath = `type-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    diagnostics.generateReport(results, reportPath);
    
    // Print summary to console
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const [file, result] of results) {
      const errors = result.errors.filter(e => e.severity === 'error').length;
      const warnings = result.errors.filter(e => e.severity === 'warning').length;
      
      if (errors > 0 || warnings > 0) {
        console.log(`\n${file}:`);
        console.log(`  Errors: ${errors}`);
        console.log(`  Warnings: ${warnings}`);
        console.log(`  Type Info:`);
        console.log(`    Implicit Any: ${result.typeInfo.implicitAny}`);
        console.log(`    Unnecessary Type Assertions: ${result.typeInfo.unnecessaryTypeAssertions}`);
        console.log(`    Loose Casts: ${result.typeInfo.looseCasts}`);
      }
      
      totalErrors += errors;
      totalWarnings += warnings;
    }
    
    console.log('\nAnalysis Summary:');
    console.log(`Total Files: ${results.size}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`\nDetailed report saved to: reports/${reportPath}`);
    
    process.exit(totalErrors > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error running TypeScript diagnostics:', error);
    process.exit(1);
  }
}

main(); 