# Task: Configuration — Set Up ESLint + Prettier + Husky

## Category: ops
## Difficulty: Medium
## Time Limit: 8 minutes

## Description

The agent receives a TypeScript project with no linting or formatting setup. Configure ESLint, Prettier, and Husky (pre-commit hook) so code quality is enforced automatically.

## Prompt

Set up code quality tooling for this TypeScript project:

1. **ESLint** with TypeScript support — catch real bugs, not style nitpicks
2. **Prettier** for formatting — consistent style without arguments
3. **Husky + lint-staged** — run lint and format on pre-commit (only on staged files)
4. **Add npm scripts** — `lint`, `lint:fix`, `format`, `format:check`

**Requirements:**
- ESLint should extend `@typescript-eslint/recommended`
- Prettier and ESLint should NOT conflict (use eslint-config-prettier)
- Pre-commit hook should: run ESLint (with --fix) and Prettier on staged .ts/.tsx files
- Don't break the existing `build` and `test` scripts

**package.json (current):**
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^1.6.0",
    "tsx": "^4.0.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0"
  }
}
```

**tsconfig.json (current):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Set everything up. The result should be: running `git commit` automatically lints and formats staged files.

## Grading Key (HIDDEN)

### ESLint Setup (+2.5):
- Installed eslint + @typescript-eslint/eslint-plugin + @typescript-eslint/parser (+0.5)
- Config file created (eslint.config.js or .eslintrc) (+0.5)
- Extends @typescript-eslint/recommended (+0.5)
- Installed eslint-config-prettier to prevent conflicts (+0.5)
- Added lint and lint:fix scripts (+0.5)

### Prettier Setup (+2):
- Installed prettier (+0.5)
- Config file created (.prettierrc or prettier.config.js) (+0.5)
- Added format and format:check scripts (+0.5)
- Reasonable defaults (singleQuote, semi, trailingComma) (+0.5)

### Husky + lint-staged (+3):
- Installed husky + lint-staged (+0.5)
- Husky initialized (prepare script or npx husky init) (+0.5)
- pre-commit hook created (+0.5)
- lint-staged config targets .ts/.tsx files (+0.5)
- lint-staged runs eslint --fix and prettier --write (+0.5)
- Only runs on staged files (not entire codebase) (+0.5)

### Quality (+2.5):
- Existing scripts (build, test, dev) still work (+0.5)
- No conflicting rules between ESLint and Prettier (+0.5)
- .prettierignore or .eslintignore for dist/ and node_modules/ (+0.5)
- Config is modern (flat config for ESLint if using v9+) (+0.5)
- Everything actually works end-to-end (+0.5)
