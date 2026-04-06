# Task: Planning — Migrate Codebase from CJS to ESM

## Category: planning
## Difficulty: Hard
## Time Limit: 10 minutes
## Binary Check: binary_check_agent_planning

## Description

The agent receives a small Node.js project (8 files) using CommonJS. The task: plan and execute a migration to ES Modules. Must handle all the gotchas (require → import, __dirname, .js extensions, package.json type, etc).

## Setup Files

### package.json
```json
{
  "name": "data-processor",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test src/**/*.test.js"
  },
  "dependencies": {
    "csv-parse": "^5.5.0",
    "dotenv": "^16.4.0"
  }
}
```

### src/index.js
```javascript
require('dotenv').config();
const { processFile } = require('./processor');
const { createReport } = require('./reporter');
const path = require('path');
const fs = require('fs');

const INPUT_DIR = path.join(__dirname, '..', 'data', 'input');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'output');

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.csv'));
  console.log(`Found ${files.length} CSV files to process`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const results = await processFile(inputPath);
    
    const reportPath = path.join(OUTPUT_DIR, file.replace('.csv', '.json'));
    await createReport(results, reportPath);
    console.log(`Processed: ${file} → ${path.basename(reportPath)}`);
  }

  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### src/processor.js
```javascript
const { parse } = require('csv-parse');
const fs = require('fs');
const { validateRow } = require('./utils/validation');
const { transformRow } = require('./utils/transform');

async function processFile(filePath) {
  const records = [];
  const errors = [];

  const parser = fs
    .createReadStream(filePath)
    .pipe(parse({ columns: true, trim: true }));

  for await (const row of parser) {
    const validation = validateRow(row);
    if (validation.valid) {
      records.push(transformRow(row));
    } else {
      errors.push({ row, errors: validation.errors });
    }
  }

  return { records, errors, total: records.length + errors.length };
}

module.exports = { processFile };
```

### src/reporter.js
```javascript
const fs = require('fs/promises');
const path = require('path');
const { formatDate } = require('./utils/helpers');

async function createReport(results, outputPath) {
  const report = {
    generatedAt: formatDate(new Date()),
    summary: {
      total: results.total,
      processed: results.records.length,
      errors: results.errors.length,
      successRate: ((results.records.length / results.total) * 100).toFixed(1) + '%',
    },
    data: results.records,
    errors: results.errors,
  };

  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  return report;
}

module.exports = { createReport };
```

### src/utils/validation.js
```javascript
function validateRow(row) {
  const errors = [];
  
  if (!row.id || isNaN(Number(row.id))) {
    errors.push('Invalid or missing id');
  }
  if (!row.email || !row.email.includes('@')) {
    errors.push('Invalid or missing email');
  }
  if (!row.amount || isNaN(parseFloat(row.amount))) {
    errors.push('Invalid or missing amount');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateRow };
```

### src/utils/transform.js
```javascript
function transformRow(row) {
  return {
    id: Number(row.id),
    email: row.email.toLowerCase().trim(),
    amount: parseFloat(row.amount),
    currency: (row.currency || 'USD').toUpperCase(),
    date: row.date || new Date().toISOString().split('T')[0],
    processed: true,
  };
}

module.exports = { transformRow };
```

### src/utils/helpers.js
```javascript
function formatDate(date) {
  return date.toISOString().replace('T', ' ').split('.')[0];
}

function getVersion() {
  const pkg = require('../../package.json');
  return pkg.version;
}

module.exports = { formatDate, getVersion };
```

### src/index.test.js
```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateRow } = require('./utils/validation');
const { transformRow } = require('./utils/transform');

describe('Validation', () => {
  it('accepts valid rows', () => {
    const result = validateRow({ id: '1', email: 'a@b.com', amount: '10.50' });
    assert.strictEqual(result.valid, true);
  });

  it('rejects missing email', () => {
    const result = validateRow({ id: '1', amount: '10' });
    assert.strictEqual(result.valid, false);
  });
});

describe('Transform', () => {
  it('transforms a row correctly', () => {
    const result = transformRow({ id: '1', email: 'A@B.com', amount: '10.50', currency: 'eur' });
    assert.strictEqual(result.id, 1);
    assert.strictEqual(result.email, 'a@b.com');
    assert.strictEqual(result.amount, 10.5);
    assert.strictEqual(result.currency, 'EUR');
  });
});
```

## Expected Migration Steps

1. Add `"type": "module"` to package.json
2. Convert all `require()` to `import` statements
3. Convert all `module.exports` to `export`
4. Replace `__dirname` with `import.meta.url` + `fileURLToPath`
5. Fix `require('../../package.json')` in helpers.js (use createRequire or fs.readFile)
6. Add `.js` extensions to all relative imports
7. Update test file imports
8. Verify everything still works

## Grading Key (HIDDEN)

### Migration Quality:
1. **Added "type": "module"** (+1): In package.json
2. **Converted require → import** (+2): All files properly converted
3. **Converted module.exports → export** (+1): All files  
4. **Fixed __dirname** (+1.5): Used fileURLToPath(import.meta.url) + path.dirname()
5. **Fixed JSON require** (+1): helpers.js require('../../package.json') → createRequire or fs.readFile
6. **Added .js extensions** (+1.5): All relative imports have .js extension
7. **Tests still pass** (+1.5): node --test works after migration

### Agent-specific:
- Created a plan before starting (+0.5)
- Migrated files in correct order (no broken intermediate states) (+0.5)
- Verified with actual test run (+0.5)
- Didn't miss any file (+0.5)
