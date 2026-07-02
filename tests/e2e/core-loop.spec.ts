import { expect, test, type Page } from "@playwright/test";

async function completeOnboarding(page: Page, name: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/onboarding/);

  const nameInput = page.getByLabel("给同行者一个名字");
  await nameInput.waitFor();
  await page.waitForTimeout(400);
  await nameInput.fill(name);
  await page.getByRole("button", { name: "开始创造分身" }).click();
  await page.getByRole("button").filter({ hasText: "ENFP" }).click();
  await page.getByRole("button", { name: "确认这位同行者" }).click();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "暂不授权，使用训练同行" }).click();
  await page.getByRole("button", { name: "一起走到第一枚碎片" }).click();
  await page.getByRole("button", { name: /亲手收集/ }).click();
  await page.getByRole("button", { name: "进入娃屋世界" }).click();
  await expect(page).toHaveURL(/map/);
}

test("new player completes the training loop into storage", async ({ page }) => {
  test.setTimeout(60_000);
  await completeOnboarding(page, "小满");

  await expect.poll(async () =>
    (await page.context().cookies()).map(({ name }) => name),
  ).toEqual(expect.arrayContaining(["wawu_session", "wawu_onboarding"]));
  await expect(page.getByText("开始同行后，碎片会稳定刷新在附近")).toBeVisible();
  await page.getByRole("button", { name: "开始训练同行" }).click();
  await expect(page.getByText("训练模拟计步")).toBeVisible();
  await expect(page.locator(".tracking-detail-label")).toContainText(
    /已自动拾取.*训练所得/,
    {
    timeout: 15_000,
    },
  );
  await expect(page.getByLabel("记忆碎片余额")).not.toContainText("0");
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

test("map refreshes real location shards before walking and can reset the player", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["geolocation"], {
    origin: "http://localhost:60553",
  });
  await context.setGeolocation({
    longitude: 121.4737,
    latitude: 31.2304,
    accuracy: 12,
  });
  await completeOnboarding(page, "阿新");

  await page.getByRole("button", { name: "刷新定位" }).click();
  await expect(page.getByText(/已刷新到当前位置|真实定位跟随中/)).toBeVisible();
  await expect(page.locator(".map-shard-label")).toContainText(
    /附近碎片已刷新/,
    { timeout: 15_000 },
  );
  const firstShardIds = await page.evaluate(async () => {
    const response = await fetch("/api/state");
    const state = await response.json();
    return (state.activeMapShards ?? []).map((shard: { id: string }) => shard.id);
  });
  expect(firstShardIds).toHaveLength(5);

  await context.setGeolocation({
    longitude: 121.489,
    latitude: 31.238,
    accuracy: 12,
  });
  await page.getByRole("button", { name: "刷新定位" }).click();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const response = await fetch("/api/state");
        const state = await response.json();
        return (state.activeMapShards ?? []).map(
          (shard: { id: string }) => shard.id,
        );
      }),
    )
    .not.toEqual(firstShardIds);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "重置体验" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.goto("/map");
  await expect(page).toHaveURL(/onboarding/);
});

test("real walk follows geolocation and automatically claims an overlapping shard", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["geolocation"], {
    origin: "http://localhost:60553",
  });
  await context.setGeolocation({
    longitude: 104.0668,
    latitude: 30.5728,
    accuracy: 10,
  });
  await completeOnboarding(page, "阿步");

  await page.getByRole("button", { name: "开始真实同行" }).click();
  await expect(page.getByText("GPS 距离估算计步")).toBeVisible();
  await expect(page.getByText(/真实定位跟随中/)).toBeVisible();
  await context.setGeolocation({
    longitude: 104.0668,
    latitude: 30.572845,
    accuracy: 10,
  });
  await expect(page.locator(".walk-status-row").getByText(/步/)).not.toHaveText(
    "0 步",
    { timeout: 10_000 },
  );
  await expect.poll(async () =>
    page.evaluate(async () => {
      const response = await fetch("/api/state");
      const state = await response.json();
      return state.activeMapShards?.[0] ?? null;
    }),
  ).not.toBeNull();
  const shard = await page.evaluate(async () => {
    const response = await fetch("/api/state");
    const state = await response.json();
    return state.activeMapShards[0] as {
      longitude: number;
      latitude: number;
    };
  });

  await context.setGeolocation({
    longitude: shard.longitude,
    latitude: shard.latitude,
    accuracy: 10,
  });
  await expect(page.locator(".tracking-detail-label")).toContainText(
    /等待(?:第 2 次|新的)定位确认/,
    { timeout: 10_000 },
  );
  await context.setGeolocation({
    longitude: shard.longitude + 0.00005,
    latitude: shard.latitude,
    accuracy: 10,
  });

  await expect(page.locator(".tracking-detail-label")).toContainText(
    /已自动拾取记忆碎片/,
    { timeout: 15_000 },
  );
  await expect(page.getByLabel("记忆碎片余额")).not.toContainText("0");

  const legacyClaimStatus = await page.evaluate(async () => {
    const response = await fetch("/api/map/shards/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        walkId: "walk-1",
        shardId: "forged",
        amount: 5,
        samples: [],
      }),
    });
    return response.status;
  });
  expect(legacyClaimStatus).toBe(400);

  await page.getByRole("button", { name: "结束同行并生成回顾" }).click();
  await expect(page.getByText("真实同行回顾")).toBeVisible();
  await expect(page.getByText(/计步来源：GPS 距离估算/)).toBeVisible();
});
