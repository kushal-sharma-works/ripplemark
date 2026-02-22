module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['tsconfig.json'],
      },
      extends: [
        'eslint:recommended',
        'plugin:@angular-eslint/recommended',
      ],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
        '@angular-eslint/component-class-suffix': 'off',
      },
    },
    {
      files: ['*.spec.ts'],
      env: {
        jest: true,
      },
      rules: {
        'no-undef': 'off',
      },
    },
    {
      files: ['*.html'],
      extends: ['plugin:@angular-eslint/template/recommended'],
    },
  ],
};
