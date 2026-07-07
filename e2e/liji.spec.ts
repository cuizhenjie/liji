import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("captures and confirms a birthday event", async ({ page }) => {
  await expect(page.getByLabel("采集收件箱输入")).toBeVisible();
  await expect(page.getByText("今日秘书简报")).toBeVisible();
  await expect(page.getByText("秘书分", { exact: true })).toBeVisible();
  await expect(page.getByText("秘书交接清单")).toBeVisible();
  await expect(page.getByText("沉淀：日程与提醒资产").first()).toBeVisible();
  await expect(page.getByText("资产沉淀回执")).toBeVisible();
  await expect(page.getByText("账单资产：房贷扣款")).toBeVisible();
  await expect(page.getByText("今日秘书工作台")).toBeVisible();
  await expect(page.getByText("验收驾驶舱")).toBeVisible();
  await expect(page.getByText("总体验收分")).toBeVisible();
  await expect(page.getByText("数据资产体检")).toBeVisible();
  await expect(page.getByText("AI 连续性")).toBeVisible();
  await expect(page.getByText("场景流转")).toBeVisible();
  await expect(page.locator("[data-slot='card-title']").filter({ hasText: /^场景剧本$/ })).toBeVisible();
  await expect(page.getByText("场景验收作战室")).toBeVisible();
  await expect(page.getByText("功能验收矩阵")).toBeVisible();
  await expect(page.getByText("F202 · 冗余预警机制", { exact: true })).toBeVisible();
  await expect(page.getByText("客户宴请").first()).toBeVisible();
  await expect(page.getByText("资产补齐任务包")).toBeVisible();
  await expect(page.getByText("关联日程：房贷扣款")).toHaveCount(0);
  await expect(page.getByText("关联交易：上海差旅").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /查看资产 日程资产/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /查看资产 合规资产/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /补齐资产 履约资产/ })).toBeVisible();
  await expect(page.getByText("资产明细台账")).toBeVisible();
  await expect(page.getByText("已关联周期账单 房贷")).toBeVisible();
  await expect(page.getByText("手动交易待关联关系、差旅或账单来源")).toBeVisible();
  await page.getByRole("button", { name: /执行资产明细 履约：李小满5岁生日履约方案/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByText("任务与确认中心")).toBeVisible();
  await expect(page.getByText("秘书时间线")).toBeVisible();
  await expect(page.getByText("待确认提醒：周明客户宴请").first()).toBeVisible();
  await page.getByRole("button", { name: /确认红线提醒/ }).click();
  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();

  await page.getByRole("button", { name: /快捷采集 客户宴请/ }).click();
  await expect(page.getByRole("button", { name: /确认采集 周明客户宴请/ })).toBeVisible();
  await page.getByRole("button", { name: /批量确认高置信采集 1/ }).click();
  await expect(page.getByText("已批量确认 1 项")).toBeVisible();

  const captureInput = page.getByLabel("采集收件箱输入");
  await captureInput.fill("周明下次宴请不吃香菜");
  await page.getByRole("button", { name: "采集", exact: true }).click();
  await expect(page.getByRole("button", { name: /归档低置信采集 1/ })).toBeVisible();
  await page.getByRole("button", { name: /归档低置信采集 1/ }).click();
  await expect(page.getByText("已归档 1 项低置信采集")).toBeVisible();

  await captureInput.fill("下周五是女儿5岁生日，预算2000元");
  await page.getByRole("button", { name: "采集", exact: true }).click();

  await expect(page.getByText("女儿5岁生日").first()).toBeVisible();
  await page.getByRole("button", { name: /确认采集 女儿5岁生日/ }).click();
  await expect(page.getByText("已确认并写入工作区")).toBeVisible();
});

test("executes the daily secretary brief primary action", async ({ page }) => {
  await expect(page.getByText("今日秘书简报")).toBeVisible();
  await expect(page.getByText("主动作：确认红线事项：周明客户宴请")).toBeVisible();

  await page.getByRole("button", { name: /执行今日秘书简报 确认红线事项：周明客户宴请/ }).click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();
  await expect(page.getByText("主动作：").first()).toBeVisible();
});

test("executes the secretary handoff delegated action", async ({ page }) => {
  await expect(page.getByText("秘书交接清单")).toBeVisible();
  await expect(page.getByText("先交接：确认红线事项：周明客户宴请")).toBeVisible();

  const handoffButton = page.getByRole("button", { name: /执行秘书交接 确认红线事项：周明客户宴请/ });
  await handoffButton.scrollIntoViewIfNeeded();
  await expect(handoffButton).toBeEnabled();
  await handoffButton.click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("客户宴请链路已通过红线检查。")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("提醒资产：周明客户宴请")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /查看资产回执 提醒资产：周明客户宴请/ })).toBeVisible();
});

test("executes the acceptance cockpit next action", async ({ page }) => {
  await expect(page.getByText("验收驾驶舱")).toBeVisible();
  await expect(page.getByText("功能验收 / F202 · 冗余预警机制").first()).toBeVisible();

  await page.getByRole("button", { name: /推进下一项验收 F202 冗余预警机制/ }).click();

  await expect(page.getByText("已确认提醒，停止升级").first()).toBeVisible();
  await expect(page.getByText("下一动作：").first()).toBeVisible();
});

test("runs dashboard scenario and asset remediation actions", async ({ page }) => {
  await expect(page.getByText("场景验收作战室")).toBeVisible();
  await page.getByRole("button", { name: /执行场景验收 客户宴请/ }).click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();
  await expect(page.getByText("客户宴请链路已通过红线检查。")).toBeVisible();

  await page.getByRole("button", { name: /执行场景验收 商务差旅/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByText("差旅方案已可进入外部平台预订。")).toBeVisible();

  await page.getByRole("button", { name: /执行资产补齐 确认履约方案：李小满5岁生日履约方案/ }).click();
  await expect(page.getByText("生日关怀链路已可执行。")).toBeVisible();
});

test("executes scenario playbook actions", async ({ page }) => {
  await expect(page.locator("[data-slot='card-title']").filter({ hasText: /^场景剧本$/ })).toBeVisible();
  await expect(page.getByText("客户宴请").first()).toBeVisible();

  await page.getByRole("button", { name: /执行场景剧本 客户宴请/ }).click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();
  await expect(page.getByText("客户宴请链路已通过红线检查。")).toBeVisible();
});

test("executes data asset health actions", async ({ page }) => {
  await expect(page.getByText("数据资产体检")).toBeVisible();
  await expect(page.getByRole("button", { name: /补齐资产 履约资产/ })).toBeVisible();

  await page.getByRole("button", { name: /补齐资产 履约资产/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
});

test("executes feature acceptance matrix actions", async ({ page }) => {
  await expect(page.getByText("功能验收矩阵")).toBeVisible();

  await page.getByRole("button", { name: /执行功能验收 F301 生日\/节日消费拆解与履约/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByText("生日关怀链路已可执行。")).toBeVisible();

  await page.getByRole("button", { name: /快捷采集 客户宴请/ }).click();
  await expect(page.getByRole("button", { name: /确认采集 周明客户宴请/ })).toBeVisible();
  await page.getByRole("button", { name: /执行功能验收 F201 智能日程自然语言录入/ }).click();
  await expect(page.getByText("已批量确认 1 项")).toBeVisible();

  await page.getByRole("button", { name: /执行功能验收 F202 冗余预警机制/ }).click();
  await expect(page.getByText("已确认提醒，停止升级").first()).toBeVisible();
  await expect(page.getByText("F202 · 冗余预警机制")).toBeVisible();
});

test("executes pending secretary timeline actions", async ({ page }) => {
  await expect(page.getByText("秘书时间线")).toBeVisible();

  await page.getByRole("button", { name: /执行时间线动作 待确认方案：李小满5岁生日履约方案/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /执行时间线动作 待确认方案：李小满5岁生日履约方案/ })).toHaveCount(0);

  await page.getByRole("button", { name: /执行时间线动作 待确认投递：周明客户宴请/ }).click();
  await expect(page.getByText("投递日志已确认")).toBeVisible();
  await expect(page.getByRole("button", { name: /执行时间线动作 待确认投递：周明客户宴请/ })).toHaveCount(0);
});

test("confirms high confidence captures from the guard rail", async ({ page }) => {
  await page.getByRole("button", { name: /快捷采集 客户宴请/ }).click();
  await expect(page.getByRole("button", { name: /护航确认高置信采集 1/ })).toBeVisible();

  await page.getByRole("button", { name: /护航确认高置信采集 1/ }).click();
  await expect(page.getByText("已批量确认 1 项")).toBeVisible();
  await expect(page.getByRole("button", { name: /护航确认高置信采集 0/ })).toBeDisabled();
});

test("executes level two recommendation cards", async ({ page }) => {
  await expect(page.getByText("Level 2 推荐卡片")).toBeVisible();

  await page.getByRole("button", { name: /执行Level 2推荐 李小满5岁生日 推荐卡/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /执行Level 2推荐 李小满5岁生日 推荐卡/ })).toHaveText(/查看方案/);
});

test("executes scenario journey cards", async ({ page }) => {
  await expect(page.getByText("场景流转")).toBeVisible();

  await page.getByRole("button", { name: /执行场景流转 关系关怀/ }).click();
  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByText("履约方案已沉淀").first()).toBeVisible();

  await page.getByRole("button", { name: /执行场景流转 差旅履约/ }).click();
  await expect(page.getByText("差旅方案已确认").first()).toBeVisible();
});

test("opens AI continuity recovery actions", async ({ page }) => {
  await expect(page.getByText("AI 连续性")).toBeVisible();
  await expect(page.getByText("云端模型未授权，已切换本地规则解析。", { exact: true })).toBeVisible();
  await expect(page.getByText("AI 接力状态")).toBeVisible();
  await expect(page.getByText("PII 脱敏", { exact: true })).toBeVisible();
  await expect(page.getByText("模型路由", { exact: true })).toBeVisible();
  await expect(page.getByText("确认入库", { exact: true })).toBeVisible();
  await expect(page.getByText("记忆纠偏", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /处理AI接力 模型路由/ }).click();
  await expect(page.getByText("隐私与授权中心")).toBeVisible();
  await expect(page.getByText("公网模型调用")).toBeVisible();
});

test("executes calendar agenda actions from the calendar page", async ({ page }) => {
  await page.getByRole("button", { name: "日历", exact: true }).click();

  await expect(page.getByText("日程执行队列")).toBeVisible();
  await expect(page.getByText("待沉淀提醒资产")).toBeVisible();

  await page.getByRole("button", { name: /执行日程动作 周明客户宴请/ }).click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();
  await expect(page.getByText("日程资产已沉淀")).toBeVisible();
});

test("opens fulfillment and generates a travel plan", async ({ page }) => {
  await page.getByRole("button", { name: "履约", exact: true }).click();
  await expect(page.getByText("履约执行队列")).toBeVisible();
  await page.getByRole("button", { name: /生成旅行方案/ }).click();

  await expect(page.getByText("礼仪交付包").first()).toBeVisible();
  await expect(page.getByText("随单放入手写祝福卡").first()).toBeVisible();
  await expect(page.getByText("广州商务差旅方案").first()).toBeVisible();
  await expect(page.getByText("行程交付包").first()).toBeVisible();
  await expect(page.getByText("行前秘书包").first()).toBeVisible();
  await expect(page.getByText(/酒店到客户地址控制在 3 公里内/).first()).toBeVisible();
  await expect(page.getByText("餐饮与打车弹性池").first()).toBeVisible();
});

test("executes fulfillment agenda actions", async ({ page }) => {
  await page.getByRole("button", { name: "履约", exact: true }).click();

  await expect(page.getByText("履约执行队列")).toBeVisible();
  await expect(page.getByText("待确认履约资产").first()).toBeVisible();

  await page.getByRole("button", { name: /执行履约动作 李小满5岁生日履约方案/ }).click();

  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await expect(page.getByText("履约资产已沉淀").first()).toBeVisible();
});

test("confirms a fulfillment plan and preserves it after reload", async ({ page }) => {
  await page.getByRole("button", { name: "履约", exact: true }).click();
  await page.getByRole("button", { name: /确认方案 李小满5岁生日履约方案/ }).first().click();

  await expect(page.getByText("方案已确认", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "履约", exact: true }).click();
  await expect(page.getByText("已确认").first()).toBeVisible();
});

test("acknowledges level one reminders from the right rail", async ({ page }) => {
  await page.getByRole("button", { name: /确认提醒 周明客户宴请/ }).click();

  await expect(page.getByText("已确认提醒，停止升级")).toBeVisible();
  await expect(page.getByText("已确认提醒：周明客户宴请").first()).toBeVisible();
});

test("adds bills and manual transactions from finance", async ({ page }) => {
  await page.getByRole("button", { name: "账单", exact: true }).click();

  await expect(page.getByText("语音轻量记账")).toBeVisible();
  await expect(page.getByText("下月预留预算方案")).toBeVisible();
  await expect(page.getByText("固定账单预留")).toBeVisible();
  await page.getByLabel("语音记账内容").fill("今天吃饭花了125元");
  await page.getByRole("button", { name: /长按语音记账/ }).click();
  await expect(page.getByRole("button", { name: /确认采集 餐饮消费/ })).toBeVisible();
  await page.getByRole("button", { name: /确认采集 餐饮消费/ }).click();
  await expect(page.getByText("已确认并写入工作区")).toBeVisible();
  await page.getByRole("button", { name: "账单", exact: true }).click();

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
  await page.getByRole("button", { name: "隐私", exact: true }).click();

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
  await page.getByRole("button", { name: "运营", exact: true }).click();

  await expect(page.getByText("生产阻塞")).toBeVisible();
  await expect(page.getByRole("button", { name: /生产检查/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /真实服务 dry-run/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /履约差异队列/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /原生采集桥/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /权益扣减流水/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /CPS 财务审批/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /告警处置日志/ })).toBeVisible();
  await expect(page.getByText("P0 上线动作")).toBeVisible();
  await expect(page.getByText("上线任务包", { exact: true })).toBeVisible();
  await expect(page.getByText("缺失环境变量")).toBeVisible();
  await expect(page.getByText("NEXT_PUBLIC_SUPABASE_URL", { exact: true })).toBeVisible();
  await expect(page.getByText("通知 SOP 与权益")).toBeVisible();
  await expect(page.getByText("P2 商业化闭环")).toBeVisible();
  await expect(page.getByText("运营告警处置")).toBeVisible();

  await page.getByRole("button", { name: /真实服务 dry-run/ }).click();
  await expect(page.getByText("真实服务 dry-run 压测完成")).toBeVisible();
});

test("edits AI memory corrections", async ({ page }) => {
  await page.getByRole("button", { name: "人脉", exact: true }).click();

  const memoryEditor = page.getByLabel(/编辑记忆/).first();
  await expect(memoryEditor).toBeVisible();
  await memoryEditor.fill("周明不吃香菜，偏好安静包间，避免高度白酒。");
  await expect(page.getByText("待复核").first()).toBeVisible();
  await page.getByRole("button", { name: /复核通过/ }).first().click();

  await expect(page.getByText("AI 记忆已复核")).toBeVisible();
  await expect(page.getByText("已复核").first()).toBeVisible();
  await expect(memoryEditor).toHaveValue("周明不吃香菜，偏好安静包间，避免高度白酒。");
});

test("writes AI memory preference suggestions into a VIP profile", async ({ page }) => {
  await page.getByRole("button", { name: "人脉", exact: true }).click();

  await expect(page.getByText("关系健康行动")).toBeVisible();
  await expect(page.getByText("确认 周明客户宴请 的合规与偏好")).toBeVisible();
  await page.getByRole("button", { name: /执行关系行动 周明 确认 周明客户宴请/ }).click();
  await expect(page.getByText("关系行动已推进")).toBeVisible();
  await expect(page.getByText("确认 周明客户宴请 的合规与偏好")).toBeHidden();
  await expect(page.getByText("偏好入库建议")).toBeVisible();
  await expect(page.getByText("周明 · 安静包间")).toBeVisible();
  await page.getByRole("button", { name: /写入偏好 周明 安静包间/ }).click();

  await expect(page.getByText("偏好已写入画像")).toBeVisible();
  await expect(page.getByText(/偏好：.*安静包间/)).toBeVisible();
});
