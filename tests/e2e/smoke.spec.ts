import { test, expect } from "@playwright/test";

async function waitForShell(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Novo projeto com IA" }).first()
  ).toBeVisible({ timeout: 30_000 });
}

test.describe("Lumiera smoke", () => {
  test("dashboard carrega com navegacao principal", async ({ page }) => {
    await waitForShell(page);
    await expect(page).toHaveTitle(/Qanat|Lumiera/i);
    await expect(
      page.getByRole("button", { name: "Flow Lab", exact: true })
    ).toBeVisible();
  });

  test("Flow Lab abre sandbox global", async ({ page }) => {
    await waitForShell(page);
    await page.getByText("Flow Lab", { exact: true }).first().click();
    await expect(page.getByText("Flow Lab (teste global)")).toBeVisible();
    await expect(page.getByText("NotebookLM offline")).toBeVisible();
  });

  test("Creator (Novo Projeto com IA) abre", async ({ page }) => {
    await waitForShell(page);
    await page
      .getByRole("button", { name: "Novo projeto com IA" })
      .last()
      .click();
    await expect(
      page.getByText("Pesquisa de apoio", { exact: true })
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

test.describe("Ralph · botões críticos do Creator", () => {
  test("Gerar Narração repete uma vez após falha de qualidade e abre a entrega", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const session = {
        version: 2,
        savedAt: new Date().toISOString(),
        wasInWizard: true,
        activeTab: "creator",
        activeProject: "Ralph_Narration_Button",
        creatorStep: 1,
        nicheInput: "engenharia histórica",
        formatSelector: "SHORTS",
        ideationTab: "custom",
        customTitle: "Como os romanos erguiam pedras gigantes",
        customHooks: "O mecanismo parecia impossível.",
        customOutline: "Explicar roldanas, vantagem mecânica e travas.",
        customBlocks: [{ block: 1, content: "Mostrar o mecanismo real." }],
        creatorProjectName: "Ralph_Narration_Button",
        showNarrationReview: false,
        narrationDraft: "",
        useNotebooklm: false,
        notebooklmDeep: false,
        useDeepResearch: false,
      };
      localStorage.setItem("qanat_wizard_session", JSON.stringify(session));
      localStorage.setItem("qanat_creator_state", JSON.stringify(session));
      localStorage.setItem("qanat_active_tab", "creator");
      localStorage.setItem("qanat_active_project", "Ralph_Narration_Button");
    });

    let generationCalls = 0;
    await page.route("**/api/ai/creator/script**", async (route) => {
      generationCalls += 1;
      if (generationCalls === 1) {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            error: "A narração foi bloqueada pela qualidade editorial.",
            details: ["Gancho genérico", "Retenção insuficiente"],
          }),
        });
        return;
      }
      // Mantém a tentativa 2 em voo para o usuário (e o teste) observar o feedback.
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          phase: "narration",
          narrative_script:
            "Há dois mil anos, uma pequena equipe romana levantava blocos que pareciam impossíveis de mover. O segredo estava na combinação de roldanas, cordas e travas que multiplicava a força sem depender de motores.",
          narrative_script_tagged: "",
          strategy: {
            hook: "Uma força multiplicada",
            title_main: "Roldanas romanas",
          },
          technical_config: { script: ["Bloco único"], block_phrases: [] },
        }),
      });
    });

    await page.goto("/");
    const generateButton = page.getByRole("button", {
      name: "Gerar Narração",
      exact: true,
    });
    await expect(generateButton).toBeVisible({ timeout: 30_000 });
    await generateButton.click();

    await expect.poll(() => generationCalls).toBe(2);
    const delivery = page.getByTestId("narration-delivery");
    await expect(delivery).toBeVisible();
    await expect(delivery).toBeInViewport();
    const approveButton = page.getByRole("button", {
      name: /Aprovar e gerar roteiro completo/i,
    });
    await expect(approveButton).toBeVisible();
  });
});
