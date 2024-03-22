/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:prettier/recommended'
  ],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  rules: {
    indent: ['error', 2]
  },
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname
  },
  root: true
}
