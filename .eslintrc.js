module.exports = {
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'airbnb-base',
    // Takes care of error 'Unable to resolve path to module' for TS imports
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'max-len': ['error', { code: 125, ignoreTemplateLiterals: true }],
    // Bypass required extension
    'import/extensions': ['error', 'never'],
  },
};
