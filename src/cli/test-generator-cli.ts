#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as glob from 'glob';
import { TestGenerator } from '../testing/test-generator';

const program = new Command();

program
  .name('test-generator')
  .description('AI-powered test generator for TypeScript files')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate tests for TypeScript files')
  .argument('<source>', 'Source file or directory pattern (e.g., "src/**/*.ts")')
  .option('-o, --output <dir>', 'Output directory for test files', 'tests')
  .action(async (source: string, options: { output: string }) => {
    const spinner = ora('Analyzing source files...').start();
    
    try {
      // Find all matching source files
      const files = glob.sync(source, {
        ignore: ['**/*.test.ts', '**/node_modules/**']
      });

      if (files.length === 0) {
        spinner.fail('No source files found');
        process.exit(1);
      }

      spinner.text = `Found ${files.length} source files. Generating tests...`;

      for (const file of files) {
        const outputDir = path.join(options.output, path.dirname(file));
        const testFile = await TestGenerator.writeTestFile(file, outputDir);
        
        console.log(chalk.green(`✓ Generated tests for ${file}`));
        console.log(chalk.gray(`  Output: ${testFile}`));
      }

      spinner.succeed(`Generated tests for ${files.length} files`);
    } catch (error: unknown) {
      spinner.fail('Test generation failed');
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(chalk.red(`\nError: ${errorMessage}`));
      process.exit(1);
    }
  });

program.parse();
