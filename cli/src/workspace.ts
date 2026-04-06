/**
 * Sandbox workspace management for agent benchmarks.
 * Creates isolated workspaces in /tmp for agent task execution.
 * Zero dependencies: uses Node.js built-in fs and path.
 */

import { mkdir, writeFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { WorkspaceSnapshot } from "./types.js";

/**
 * Create an isolated workspace directory with setup files.
 */
export async function createWorkspace(
  taskId: string,
  setupFiles: Record<string, string>,
): Promise<string> {
  const workspacePath = join("/tmp", `bench-${taskId}`);

  await mkdir(workspacePath, { recursive: true });

  for (const [filePath, content] of Object.entries(setupFiles)) {
    const fullPath = join(workspacePath, filePath);
    const dir = fullPath.slice(0, fullPath.lastIndexOf("/"));
    if (dir !== workspacePath) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(fullPath, content, "utf-8");
  }

  return workspacePath;
}

/**
 * Capture a snapshot of the workspace: files created, modified, etc.
 */
export async function captureWorkspace(
  workspacePath: string,
): Promise<WorkspaceSnapshot> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push(fullPath.slice(workspacePath.length + 1));
      }
    }
  }

  try {
    await stat(workspacePath);
    await walk(workspacePath);
  } catch {
    // Workspace doesn't exist or is empty
  }

  return {
    files_created: files,
    files_modified: [],
    commands_run: [],
    total_files: files.length,
  };
}

/**
 * Clean up a workspace directory.
 */
export async function cleanupWorkspace(workspacePath: string): Promise<void> {
  try {
    await rm(workspacePath, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}
