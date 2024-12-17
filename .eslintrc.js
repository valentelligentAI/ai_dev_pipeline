module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'jest'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended'
  ],
  env: {
    node: true,
    es2020: true,
    'jest/globals': true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-console': 'warn',
    '@typescript-eslint/no-empty-function': ['error', {
      allow: ['private-constructors']
    }],
    '@typescript-eslint/no-require-imports': 'error',
    'no-empty': ['error', {
      allowEmptyCatch: true
    }],
    '@typescript-eslint/interface-name-prefix': ['error', { prefixWithI: 'always' }],
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js'
  ]
}; 