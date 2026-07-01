import { expect, test } from "@playwright/test";

test("captures and confirms a birthday event", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("采集收件箱输入")).toBeVisible();
  await expect(page.getByText("任务与确认中心")).toBeVisible();

  const captureInput = page.getByLabel("采集收件箱输入");
  await captureInput.fill("下周五是女儿5岁生日，预算2000元");
  await page.getByRole("button", { name: /采集/ }).click();

  await expect(page.getByText("女儿5岁生日").first()).toBeVisible();
  await page.getByRole("button", { name: "确认" }).first().click();
  await expect(page.getByText("已确认并写入工作区")).toBeVisible();
});

test("opens fulfillment and generates a travel plan", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /履约/ }).first().click();
  await page.getByRole("button", { name: /生成旅行方案/ }).click();

  await expect(page.getByText("广州商务差旅方案").first()).toBeVisible();
  await expect(page.getByText("餐饮与打车弹性池").first()).toBeVisible();
});
