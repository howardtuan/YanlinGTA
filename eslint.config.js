import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      // 變數與作用域嚴格化
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'no-undef': 'error',

      // 型別安全與邏輯防呆
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'warn',
      'no-dupe-keys': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],

      // 現代語法與代碼一致性
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      'no-useless-concat': 'warn',
      'no-useless-rename': 'error',

      // 異步與安全
      'no-async-promise-executor': 'error',
      'no-promise-executor-return': 'error',

      // 專案特有：允許中文字串與註解內的全形空格 \u3000
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipComments: true, skipTemplates: true },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'vendor/**',
      'tools/**',
      'docs/**',
      'assets/**',
      'data/**',
      '.vite/**',
      '.claude/**',
      '.codegraph/**',
    ],
  },
];
