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
    // Node 執行的設定檔、測試與工具腳本
    files: [
      'vite.config.js',
      'eslint.config.js',
      'tests/**/*.js',
      'tools/*.mjs',
      'tools/e2e/serve.mjs',
      'tools/e2e/smoke.mjs',
      'tools/e2e/story-bot.mjs',
      'tools/e2e/cdp.mjs',
      'tools/perf/*.mjs',
      'tools/floorplan/**/*.mjs',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // 通關機器人注入遊戲頁面的腳本：在瀏覽器裡以一般 script 執行，不是 ES module
    files: ['tools/e2e/bot-page.js', 'tools/e2e/page-init.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        game: 'readonly', // 遊戲本體掛在 window.game
        __storyBot: 'writable', // bot-page.js 自己掛的 window.__storyBot
        __e2e: 'writable', // page-init.js 掛的 window.__e2e
        __e2eSend: 'readonly', // story-bot.mjs 用 Runtime.addBinding 加的回傳通道
        __E2E_CFG__: 'readonly', // 佔位字串，story-bot.mjs 注入前換成 JSON 設定
      },
    },
  },
  {
    // 效能量測腳本注入遊戲頁面：一般 script，__BENCH_CFG__ 由 profile_scene.mjs 換成 JSON
    files: ['tools/perf/page-hook.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        __BENCH_CFG__: 'readonly',
        __bench: 'writable',
      },
    },
  },
  {
    ignores: [
      'dist/**',
      'vendor/**',
      // tools/ 只忽略產出物
      'tools/npc-dashboard/photos/**',
      'tools/e2e/out/**',
      'tools/.cache/**',
      'tools/wasm-kernels/target/**',
      'docs/**',
      'assets/**',
      'data/**',
      '.vite/**',
      '.claude/**',
      '.codegraph/**',
    ],
  },
];
