import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended, // 배열 전개 연산자 확인
      reactHooks.configs.flat.recommended,
      // reactRefresh.configs.vite, // 플러그인에 따라 설정 방식이 다를 수 있음
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // 핵심: 여기에 규칙을 추가합니다.
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 사용하지 않는 변수가 있어도 에러(2)가 아닌 경고(1)만 표시하거나 끔(0)
      'no-unused-vars': 'off', 
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])