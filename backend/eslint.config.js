const js = require('@eslint/js');
const ts = require('typescript-eslint');

module.exports = [
  { ignores: ['dist', 'node_modules', '.next'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
