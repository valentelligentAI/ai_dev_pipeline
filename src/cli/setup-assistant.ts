#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { EnvironmentChecker } from '../utils/environment-checker';
import { EnvironmentValidator } from '../utils/environment-validator';

const program = new Command();

program
  .name('setup-assistant')
  .description('AI Development Pipeline Setup Assistant')
  .version('1.0.0');

program
  .command('check')
  .description('Check development environment')
  .action(async () => {
    const spinner = ora('Validating environment...').start();

    try {
      // First, validate the environment
      const validationResult = await EnvironmentValidator.validateEnvironment();
      spinner.stop();
      
      // Print validation results
      EnvironmentValidator.printValidationResult(validationResult);

      if (!validationResult.isValid) {
        console.log(chalk.red('\nEnvironment validation failed. Please fix the issues above before proceeding.'));
        process.exit(1);
      }

      // If environment is valid, proceed with detailed checks
      spinner.start('Checking environment details...');
      const envInfo = await EnvironmentChecker.checkEnvironment();
      const issues = EnvironmentChecker.validateRequirements(envInfo);

      spinner.stop();

      console.log('\nEnvironment Information:');
      console.log('----------------------');
      console.log(`Node.js: ${chalk.cyan(envInfo.nodeVersion)}`);
      console.log(`npm: ${chalk.cyan(envInfo.npmVersion)}`);
      console.log(`Git: ${chalk.cyan(envInfo.gitVersion)}`);
      console.log(`\nOperating System: ${chalk.cyan(envInfo.os.platform)} ${envInfo.os.release} (${envInfo.os.arch})`);
      console.log(`Memory: ${chalk.cyan((envInfo.memory.total / (1024 * 1024 * 1024)).toFixed(2))}GB total`);

      if (issues.length > 0) {
        console.log('\n⚠️  Issues Found:');
        issues.forEach(issue => {
          console.log(chalk.yellow(`- ${issue}`));
        });
        process.exit(1);
      } else {
        console.log(chalk.green('\n✓ Environment meets all requirements'));
      }
    } catch (error) {
      spinner.fail('Environment check failed');
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(); 