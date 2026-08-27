// Type-aware ESLint config. Required for agentdrifthook's "lint-gate" convention
// type (tools/agentdrifthook) to run @typescript-eslint/no-unsafe-type-assertion
// against edited files — see tools/agentdrifthook/data/ledger.json.
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['src/**/*.ts', 'src/**/*.tsx'],
  extends: [...tseslint.configs.recommendedTypeChecked],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-unsafe-type-assertion': 'warn',
  },
});
