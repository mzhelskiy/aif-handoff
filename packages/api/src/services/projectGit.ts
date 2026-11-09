import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  branchExists,
  getCurrentBranch,
  getProjectConfig,
  isBranchIsolationError,
  isGitRepo,
  validateBranchName,
  type ProjectBranchOptions,
} from "@aif/shared";

export function getProjectBranches(projectRoot: string): ProjectBranchOptions {
  if (!existsSync(projectRoot) || !isGitRepo(projectRoot)) {
    return { isRepository: false, currentBranch: null, branches: [], workingBranch: null };
  }
  const output = execFileSync("git", ["for-each-ref", "--format=%(refname:short)", "refs/heads/"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 5000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    isRepository: true,
    currentBranch: getCurrentBranch(projectRoot),
    branches: output
      .split("\n")
      .map((branch) => branch.trim())
      .filter(Boolean),
    workingBranch: null,
  };
}

export function validateProjectWorkingBranch(projectRoot: string, branch: string): string | null {
  try {
    validateBranchName(projectRoot, branch);
  } catch (error) {
    if (isBranchIsolationError(error)) return error.message;
    throw error;
  }
  if (!isGitRepo(projectRoot) || !branchExists(projectRoot, branch)) {
    return `Working branch "${branch}" does not exist locally in this project.`;
  }
  if (!getProjectConfig(projectRoot).git.enabled)
    return "Enable Git in the project configuration before selecting a working branch.";
  return null;
}
