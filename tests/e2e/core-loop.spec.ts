import { expect, test } from "@playwright/test";

test("new player completes the training loop into storage", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page).toHaveURL(/onboarding/);

  const nameInput = page.getByLabel("给同行者一个名字");
  await nameInput.waitFor();
  await page.waitForTimeout(400);
  await nameInput.fill("小满");
  await page.getByRole("button", { name: "开始创造分身" }).click();
  await page.getByRole("button").filter({ hasText: "ENFP" }).click();
  await page.getByRole("button", { name: "确认这位同行者" }).click();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "暂不授权，使用训练同行" }).click();
  await page.getByRole("button", { name: "一起走到第一枚碎片" }).click();
  await page.getByRole("button", { name: /亲手收集/ }).click();
  await page.getByRole("button", { name: "进入娃屋世界" }).click();

  await expect.poll(async () =>
    (await page.context().cookies()).map(({ name }) => name),
  ).toEqual(expect.arrayContaining(["wawu_session", "wawu_onboarding"]));
  await expect(page).toHaveURL(/map/);
  await expect(page.getByText("地图上会随机刷新可拾取的记忆碎片")).toBeVisible();
  const shardClaim = await page.evaluate(async () => {
    const response = await fetch("/api/map/shards/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shardId: "e2e-visible-shard", amount: 2 }),
    });
    return { ok: response.ok, status: response.status, body: await response.text() };
  });
  if (!shardClaim.ok) {
    throw new Error(`map shard claim failed: ${JSON.stringify(shardClaim)}`);
  }
  expect(shardClaim.status).toBe(200);
  await page.reload();
  await expect(page.getByLabel("记忆碎片余额")).toContainText("2");
  await page.getByRole("button", { name: "开始训练同行" }).click();
  await page.getByRole("button", { name: /听听.*发现了什么/ }).click();
  await expect(page.getByText(/预置结果|Coze 原生模型生成/)).toBeVisible();
  await page.getByRole("button", { name: "一起去看看" }).click();
  await page.getByRole("button", { name: "完成训练打卡" }).click();
  await page.getByRole("link", { name: "打开我的娃屋" }).click();

  await expect(page).toHaveURL(/house/);
  await expect(page.getByRole("button", { name: /摆件柜/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /衣装柜/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /纪念柜/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /明信片夹/ })).toBeVisible();
  await expect(page.getByText("训练所得")).toBeVisible();
  await expect(page.getByText("一只装着共同记忆的储物柜")).toBeVisible();
});
