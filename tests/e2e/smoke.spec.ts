import { test, expect } from "@playwright/test";

async function waitForShell(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByText("Novo Projeto com IA")).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Lumiera smoke", () => {
  test("dashboard carrega com navegacao principal", async ({ page }) => {
    await waitForShell(page);
    await expect(page).toHaveTitle(/Qanat|Lumiera/i);
    await expect(page.getByText("Flow Lab", { exact: true })).toBeVisible();
  });

  test("Flow Lab abre sandbox global", async ({ page }) => {
    await waitForShell(page);
    await page.getByText("Flow Lab", { exact: true }).click();
    await expect(page.getByText("Flow Lab (teste global)")).toBeVisible();
    await expect(page.getByText("NotebookLM offline")).toBeVisible();
  });

  test("Creator (Novo Projeto com IA) abre", async ({ page }) => {
    await waitForShell(page);
    await page.getByText("Novo Projeto com IA").click();
    await expect(
      page.getByText("NotebookLM", { exact: false }).first()
    ).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("API smoke", () => {
  test("health e notebooklm status respondem", async ({ request }) => {
    const health = await request.get("http://127.0.0.1:3005/api/health");
    expect(health.ok()).toBeTruthy();

    const nlm = await request.get(
      "http://127.0.0.1:3005/api/notebooklm/status"
    );
    expect(nlm.ok()).toBeTruthy();
    const body = await nlm.json();
    expect(body).toHaveProperty("authenticated");
  });
});
