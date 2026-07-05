import { test, expect } from "@playwright/test";

async function runCommand(page, cmd) {
  const input = page.locator(".prompt-input");
  await input.fill(cmd);
  await input.press("Enter");
}

test.describe("Terminal", () => {
  test.beforeEach(async ({ page }) => {
    // Skip the onboarding screen: these tests target the terminal itself,
    // the onboarding flow has its own spec.
    await page.addInitScript(() => {
      localStorage.setItem("simulateur-amadeus:skip-onboarding", "1");
    });
  });

  test("shows the initial banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();
    await expect(page.getByText("TRAINING MODE")).toBeVisible();
  });

  test("AN shows availability rows and arrow keys move the token selection", async ({
    page,
  }) => {
    await page.goto("/");
    await runCommand(page, "AN26DECALGPAR");
    await expect(page.getByText(/AMADEUS AVAILABILITY - AN/)).toBeVisible();

    const selected = page.locator(".avail-token.selected");
    await expect(selected).toHaveCount(1);
    const before = await selected.textContent();

    await page.locator(".prompt-input").press("ArrowRight");
    await expect(page.locator(".avail-token.selected")).not.toHaveText(before);
  });

  test("airline filter shows NO FLIGHTS when nothing matches", async ({ page }) => {
    await page.goto("/");
    await runCommand(page, "AN26DECALGPAR/ZZ");
    await expect(page.getByText("NO FLIGHTS")).toBeVisible();
  });

  test("Enter on a selected token builds and runs an SS command", async ({ page }) => {
    await page.goto("/");
    await runCommand(page, "AN26DECALGPAR");
    await expect(page.getByText(/AMADEUS AVAILABILITY - AN/)).toBeVisible();

    await page.locator(".prompt-input").press("Enter");
    await expect(page.getByText(/^> SS\d+[A-Z]\d+$/)).toBeVisible();
    await expect(page.getByText("OK")).toBeVisible();
  });

  test("full happy path AN -> SS -> NM -> AP -> RF -> ER -> RT records a PNR", async ({
    page,
  }) => {
    await page.goto("/");
    await runCommand(page, "AN26DECALGPAR");
    await runCommand(page, "SS1Y1");
    await runCommand(page, "NM1DOE/JOHN MR");
    await runCommand(page, "AP123456");
    await runCommand(page, "RFTEST");
    await runCommand(page, "ER");
    await runCommand(page, "RT");

    // "DOE/JOHN MR" legitimately appears several times (echoed input line +
    // PNR display after every step) - assert on the record locator, which
    // only appears once ER succeeds, to confirm the whole sequence worked.
    await expect(page.getByText(/RECORD LOCATOR [A-Z]{6}/)).toBeVisible();
    await expect(page.getByText("DOE/JOHN MR").first()).toBeVisible();
  });

  test("keeps the prompt line centered in the viewport as output grows", async ({ page }) => {
    await page.goto("/");
    for (let i = 0; i < 20; i++) {
      await runCommand(page, "HE");
    }

    const screen = page.locator(".screen");
    await expect(async () => {
      const { anchorMid, viewportMid } = await screen.evaluate((el) => {
        const anchor = el.querySelector(".bottom-anchor");
        const anchorRect = anchor.getBoundingClientRect();
        const screenRect = el.getBoundingClientRect();
        return {
          anchorMid: anchorRect.top - screenRect.top,
          viewportMid: screenRect.height / 2,
        };
      });
      // The bottom anchor (right after the prompt line) should sit near the
      // vertical middle of the visible area, not pinned to the bottom.
      expect(Math.abs(anchorMid - viewportMid)).toBeLessThan(40);
    }).toPass();
  });
});
