import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/*
 * The API has no framework preset to lean on, so this is the base recommended
 * set plus type-aware TypeScript rules. Type information is required, which
 * means the lint script must run after a typecheck-capable program is available;
 * `tseslint.configs.recommendedTypeChecked` gives the rules that actually catch
 * real defects (`no-floating-promises`, unsafe `any` returns) rather than
 * formatting opinions.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    /*
     * `memory.store.ts` implements the async DataStore interface synchronously —
     * it is in-process Maps, so there is genuinely nothing to await. The `async`
     * keyword only exists to satisfy the signature.
     */
    files: ['src/data/memory.store.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  {
    /*
     * The Supabase adapter is the one place that touches an untyped client:
     * `@supabase/supabase-js` returns `any` unless database types are generated
     * into the project. Every value it produces is immediately re-validated by
     * the Zod contracts at the service boundary, which is where that untyped
     * data stops being able to reach a client.
     */
    files: ['src/data/supabase.store.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);