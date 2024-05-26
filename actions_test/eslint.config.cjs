const jest = require('eslint-plugin-jest');

module.exports = [
  {
    files: ['**/*.test.*'], 
    ...jest.configs['flat/all']
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module' 
    },
    rules: {
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    }
  }
];