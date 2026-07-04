import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("captures and confirms a birthday event", async ({ page }) => {
  await expect(page.getByLabel("采集收件箱输入")).toBeVisible();
  await expect(page.getByText("任务与确认中心")).toBeVisible();

  const captureInput = page.getByLabel("采集收件箱输入");
  await captureInput.fill("下周五是女儿5岁生日，预算2000元");
  await page.getByRole("button", { name: /采集/ }).click();

  await expect(page.getByText("女儿5岁生日").first()).toBeVisible();
  await page.getByRole("button", { name: /确认采集 女儿5岁生日/ }).click();
  await expect(page.getByText("已确认并写入工作区")).toBeVisible();
});

test("opens fulfillment and generates a travel plan", async ({ page }) => {
  await page.getByRole("button", { name: /履约/ }).first().click();
  await page.getByRole("button", { name: /生成旅行方案/ }).click();

  await expect(page.getByText("广州商务差旅方案").first()).toBeVisible();
  await expect(page.getByText("餐饮与打车弹性池").first()).toBeVisible();
});

test("confirms a fulfillment plan and preserves it after reload", async ({ page }) => {
  await page.getByRole("button", { name: /履约/ }).first().click();
  await page.getByRole("button", { name: /确认方案 李小满5岁生日履约方案/ }).first().click();

  await expect(page.getByText("方案已确认")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /履约/ }).first().click();
  await expect(page.getByText("已确认").first()).toBeVisible();
});

test("acknowledges level one reminders from the right rail", async ({ page }) => {
  await page.getByRole("button", { name: /确认提醒 周明客户宴请/ }).click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();
  await expect(page.getByRole("button", { name: /确认提醒 周明客户宴请/ })).toContainText("已确认");
});

test("adds bills and manual transactions from finance", async ({ page }) => {
  await page.getByRole("button", { name: /账单/ }).first().click();

  await page.getByLabel("账单名称").fill("物业费");
  await page.getByLabel("账单金额").fill("680");
  await page.getByLabel("账单扣款日").fill("15");
  await page.getByLabel("账单扣款账户").fill("招商银行尾号 1001");
  await page.getByRole("button", { name: /新增周期账单/ }).click();

  await expect(page.getByText("周期账单已新增")).toBeVisible();
  await expect(page.getByText("物业费").first()).toBeVisible();

  await page.getByLabel("交易名称").fill("客户午餐");
  await page.getByLabel("交易金额").fill("268");
  await page.getByRole("button", { name: /手动入账/ }).click();

  await expect(page.getByText("交易已入账并更新复盘")).toBeVisible();
});

test("shows privacy, auth and authorization controls", async ({ page }) => {
  await page.getByRole("button", { name: /隐私/ }).first().click();

  await expect(page.getByText("账号与云同步")).toBeVisible();
  await expect(page.getByText("第三方授权状态")).toBeVisible();
  await expect(page.getByText("OpenAI 结构化解析")).toBeVisible();
  await expect(page.getByLabel("登录邮箱")).toBeVisible();
  await expect(page.getByRole("button", { name: /发送登录链接/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /注册Push/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /导出数据/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /删除本地数据/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /删除云端数据/ })).toBeVisible();
});

test("shows operations readiness and high ROI controls", async ({ page }) => {
  await page.getByRole("button", { name: /运营/ }).first().click();

  await expect(page.getByText("生产阻塞")).toBeVisible();
  await expect(page.getByRole("button", { name: /生产检查/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /真实服务 dry-run/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /履约差异队列/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /原生采集桥/ })).toBeVisible();
  await expect(page.getByText("P0 上线动作")).toBeVisible();
  await expect(page.getByText("通知 SOP 与权益")).toBeVisible();

  await page.getByRole("button", { name: /真实服务 dry-run/ }).click();
  await expect(page.getByText("真实服务 dry-run 压测完成")).toBeVisible();
});

test("edits AI memory corrections", async ({ page }) => {
  await page.getByRole("button", { name: /人脉/ }).first().click();

  const memoryEditor = page.getByLabel(/编辑记忆/).first();
  await expect(memoryEditor).toBeVisible();
  await memoryEditor.fill("周明不吃香菜，偏好安静包间，避免高度白酒。");
  await expect(page.getByText("待复核").first()).toBeVisible();
  await page.getByRole("button", { name: /复核通过/ }).first().click();

  await expect(page.getByText("AI 记忆已复核")).toBeVisible();
  await expect(page.getByText("已复核").first()).toBeVisible();
  await expect(memoryEditor).toHaveValue("周明不吃香菜，偏好安静包间，避免高度白酒。");
});
