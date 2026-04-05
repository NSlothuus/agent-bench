#!/usr/bin/env npx tsx
/**
 * Generate seed SQL from the existing benchmark task files.
 * Run from the api/ directory:
 *   npx tsx scripts/generate-seed.ts > migrations/0002_seed_tasks.sql
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const TASKS_DIR = "/Users/aislothuus/sh1ft/main-agent/shared/benchmarks/v2/tasks";

// Task configurations matching runner.py's TASK_CONFIG
const TASK_CONFIG: Record<string, {
  file: string;
  category: string;
  label: string;
  binaryCheckFn: string | null;
  specialistName: string | null;
}> = {
  "code-review": {
    file: "01-code/02-review-subtle.md",
    category: "code",
    label: "Code Review (subtle bugs)",
    binaryCheckFn: "binary_check_code_review",
    specialistName: "code-reviewer",
  },
  "restraint": {
    file: "04-reasoning/03-strategic-restraint.md",
    category: "reasoning",
    label: "Strategic Restraint",
    binaryCheckFn: "binary_check_restraint",
    specialistName: "code-reviewer",
  },
  "safety": {
    file: "06-human-logic/01-safety.md",
    category: "safety",
    label: "Safety (destructive ops)",
    binaryCheckFn: "binary_check_safety",
    specialistName: null, // inline specialist
  },
  "writing": {
    file: "03-writing/01-anti-slop.md",
    category: "writing",
    label: "Writing (anti-slop blog post)",
    binaryCheckFn: "binary_check_writing",
    specialistName: "copywriter",
  },
  "design": {
    file: "02-visual-design/01-landing-page.md",
    category: "design",
    label: "Visual Design (landing page)",
    binaryCheckFn: null,
    specialistName: "frontend-dev",
  },
  "multi-step": {
    file: "05-multi-step/02-recovery.md",
    category: "multi-step",
    label: "Multi-Step Recovery",
    binaryCheckFn: null,
    specialistName: null, // inline specialist
  },
};

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function splitPromptAndGradingKey(content: string): { prompt: string; gradingKey: string } {
  // Split at the "Grading Key" marker
  const markers = [
    "## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)",
    "## Grading Key",
    "## Grading",
  ];

  for (const marker of markers) {
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      return {
        prompt: content.substring(0, idx).trim(),
        gradingKey: content.substring(idx).trim(),
      };
    }
  }

  // No grading key found — treat the whole thing as the prompt
  return { prompt: content.trim(), gradingKey: "" };
}

function main(): void {
  const lines: string[] = [
    "-- Agent Bench Seed Data",
    "-- Auto-generated from benchmark task files",
    "-- DO NOT EDIT MANUALLY",
    "",
  ];

  for (const [taskId, config] of Object.entries(TASK_CONFIG)) {
    const filePath = join(TASKS_DIR, config.file);
    const content = readFileSync(filePath, "utf-8");
    const { prompt, gradingKey } = splitPromptAndGradingKey(content);

    lines.push(
      `INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)`,
      `VALUES (`,
      `  '${escapeSQL(taskId)}',`,
      `  '${escapeSQL(config.category)}',`,
      `  '${escapeSQL(config.label)}',`,
      `  '${escapeSQL(prompt)}',`,
      `  '${escapeSQL(gradingKey)}',`,
      `  ${config.binaryCheckFn ? `'${escapeSQL(config.binaryCheckFn)}'` : "NULL"},`,
      `  ${config.specialistName ? `'${escapeSQL(config.specialistName)}'` : "NULL"},`,
      `  1,`,
      `  1`,
      `);`,
      "",
    );
  }

  process.stdout.write(lines.join("\n") + "\n");
}

main();
