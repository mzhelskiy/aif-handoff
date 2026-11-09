import { expect, test } from "@playwright/test";

const PROJECT_ID = "00000000-0000-4000-8000-000000000165";

test("switches project board layouts without losing tasks or exact stages", async ({ page }) => {
  let project = {
    id: PROJECT_ID,
    name: "Project board settings",
    rootPath: "/tmp/project-board",
    boardLayout: "compact",
    defaultSkipReview: null as boolean | null,
    defaultRunPlanImprove: null,
    defaultRunPostVerify: null,
    workingBranch: null,
    parallelEnabled: false,
    autoQueueMode: false,
  };
  const task = (status: string) => ({
    id: `board-${status}`,
    projectId: PROJECT_ID,
    title: `Task ${status}`,
    description: "",
    status,
    autoMode: false,
    executionOwner: "ai",
    ownershipRevision: 0,
    assignees: [],
    isFix: false,
    priority: 0,
    position: 1000,
    blockedReason: null,
    blockedFromStatus: null,
    retryAfter: null,
    retryCount: 0,
    tokenInput: 0,
    tokenOutput: 0,
    tokenTotal: 0,
    costUsd: 0,
    roadmapAlias: null,
    tags: [],
    reworkRequested: false,
    reviewIterationCount: 0,
    maxReviewIterations: 3,
    manualReviewRequired: false,
    paused: true,
    lastSyncedAt: null,
    runtimeProfileId: null,
    modelOverride: null,
    runtimeLimitSnapshot: null,
    runtimeLimitUpdatedAt: null,
    scheduledAt: null,
    hasPlan: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await page.route(
    (url) => url.pathname === "/projects",
    (route) => route.fulfill({ json: [project] }),
  );
  await page.route(
    (url) => url.pathname === `/projects/${PROJECT_ID}`,
    async (route) => {
      expect(route.request().method()).toBe("PUT");
      project = { ...project, ...route.request().postDataJSON() };
      await route.fulfill({ json: project });
    },
  );
  await page.route(
    (url) => url.pathname === "/projects/branches",
    (route) =>
      route.fulfill({
        json: {
          isRepository: true,
          currentBranch: "main",
          branches: ["main"],
          workingBranch: null,
        },
      }),
  );
  await page.route(
    (url) => url.pathname === "/tasks",
    (route) => route.fulfill({ json: [task("review"), task("verified")] }),
  );
  await page.route("**/settings", (route) =>
    route.fulfill({
      json: {
        useSubagents: false,
        maxReviewIterations: 3,
        usageLimitsEnabled: false,
        warmupEnabled: false,
        qaPipelineEnabled: false,
        githubIssuePrEnabled: false,
        runtimeReadiness: {
          availableRuntimeCount: 0,
          runtimeProfileCount: 0,
          enabledRuntimeProfileCount: 0,
        },
        runtimeDefaults: { app: {} },
      },
    }),
  );
  await page.route("**/runtime-profiles/effective/chat/*", (route) =>
    route.fulfill({ json: { profile: null, resolved: null } }),
  );

  await page.goto(`/project/${PROJECT_ID}`);
  const board = page.getByTestId("kanban-board");
  await expect(board.getByRole("heading")).toHaveCount(5);
  await expect(board.getByLabel("Task stage: Review", { exact: true })).toBeVisible();
  await expect(board.getByLabel("Task stage: Verified", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Project board settings/ }).click();
  await page.getByTitle("Edit", { exact: true }).click();
  await page.getByRole("button", { name: "Board layout", exact: true }).click();
  await page.getByRole("option", { name: "Detailed — all stages", exact: true }).click();
  await page.getByRole("button", { name: "Review new tasks", exact: true }).click();
  await page.getByRole("option", { name: "Disabled", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(board.getByRole("heading")).toHaveCount(10);
  await expect(board.getByText("Task review", { exact: true })).toBeVisible();
  await expect(board.getByText("Task verified", { exact: true })).toBeVisible();
  expect(project.defaultSkipReview).toBe(true);

  await page.reload();
  await expect(page.getByTestId("kanban-board").getByRole("heading")).toHaveCount(10);
});
