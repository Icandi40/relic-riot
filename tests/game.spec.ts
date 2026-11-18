import { test, expect } from "@playwright/test";
import path from "node:path";
import type { Page } from "@playwright/test";
async function driveTo(page: Page, x: number, z: number) {
  const label = page.locator(".runner-label.is-you");
  let held = new Set<string>();
  for (let i = 0; i < 160; i++) {
    const px = Number(await label.getAttribute("data-x")),
      pz = Number(await label.getAttribute("data-z"));
    if (i % 40 === 0)
      console.log(`Driving to (${x},${z}); runner (${px},${pz}).`);
    if (Math.hypot(px - x, pz - z) < 0.5) {
      for (const k of held) await page.keyboard.up(k);
      return;
    }
    const next = new Set<string>();
    if (Math.abs(x - px) > 0.18) next.add(x > px ? "d" : "a");
    if (Math.abs(z - pz) > 0.18) next.add(z > pz ? "s" : "w");
    for (const k of held) if (!next.has(k)) await page.keyboard.up(k);
    for (const k of next) if (!held.has(k)) await page.keyboard.down(k);
    held = next;
    await page.waitForTimeout(100);
  }
  for (const k of held) await page.keyboard.up(k);
  throw new Error(
    "Runner did not reach the target through real keyboard input.",
  );
}
const evidence = path.resolve(process.cwd(), "../../work/qa");
const release = process.env.GAME_RELEASE
  ? `release=${encodeURIComponent(process.env.GAME_RELEASE)}`
  : "";
const homePath = release ? `./?${release}` : "./";
test("home, instructions, practice and responsive layout", async ({
  browser,
}) => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1024 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(homePath);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("RELIC");
  await page.screenshot({
    path: path.join(evidence, "home-desktop.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: /Open mastery/ }).click();
  await expect(page.getByTestId("shard-balance")).toHaveText("0");
  await expect(page.getByTestId("claim-courier")).toBeDisabled();
  await page.screenshot({
    path: path.join(evidence, "mastery-desktop.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "WARDROBE", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "UNLOCK · 240 ◆" }),
  ).toBeDisabled();
  await page.screenshot({
    path: path.join(evidence, "wardrobe-desktop.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "HOW TO PLAY" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Choose VESPER/ }).click();
  await expect(
    page.getByRole("button", { name: /Choose VESPER/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /PRACTICE RUN/ }).click();
  await expect(page.locator(".countdown-overlay")).toBeVisible();
  await expect(page.locator(".countdown-overlay")).toHaveCount(0, {
    timeout: 12000,
  });
  await expect(page.locator("canvas")).toBeVisible();
  await page.keyboard.down("d");
  await page.waitForTimeout(600);
  await page.keyboard.up("d");
  await page.keyboard.press("Space");
  await expect(page.locator(".pulse-button")).toHaveClass(/charging/);
  await page.screenshot({ path: path.join(evidence, "arena-desktop.png") });
  await page.getByRole("button", { name: "LEAVE ROOM", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "LEAVE ROOM" })
    .click();
  await expect(page.getByRole("button", { name: "CREATE ROOM" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: path.join(evidence, "home-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /Open mastery/ }).click();
  await page.screenshot({
    path: path.join(evidence, "mastery-mobile.png"),
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /PRACTICE RUN/ }).click();
  await expect(page.locator(".countdown-overlay")).toHaveCount(0, {
    timeout: 12000,
  });
  await expect(page.locator(".touch-controls")).toBeVisible();
  const joystick = await page.locator(".joystick").boundingBox();
  const mobileLabel = page.locator(".runner-label.is-you");
  const startPosition = Number(await mobileLabel.getAttribute("data-x"));
  await page.mouse.move(
    joystick!.x + joystick!.width / 2,
    joystick!.y + joystick!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    joystick!.x + joystick!.width - 8,
    joystick!.y + joystick!.height / 2,
  );
  await expect
    .poll(
      async () =>
        Number(await mobileLabel.getAttribute("data-x")) - startPosition,
    )
    .toBeGreaterThan(0.1);
  await page.mouse.up();
  await page.getByRole("button", { name: "Pulse nearby rivals" }).click();
  await expect(page.locator(".touch-pulse")).toHaveClass(/charging/);
  await page.screenshot({ path: path.join(evidence, "arena-mobile.png") });
  expect(errors).toEqual([]);
  await page.close();
});

test("two independent browsers join through internet signaling and play a real shared match", async ({
  browser,
}) => {
  test.setTimeout(260000);
  const hostContext = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
  });
  const guestContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const errors: string[] = [];
  host.on("pageerror", (e) => errors.push(e.message));
  guest.on("pageerror", (e) => errors.push(e.message));
  for (const page of [host, guest])
    page.on("console", (m) => {
      if (m.text().startsWith("Room connection:")) console.log(m.text());
    });
  await host.goto(homePath);
  await host.getByLabel("YOUR CALLSIGN").fill("SHEENA");
  await host.getByRole("button", { name: "CREATE ROOM" }).click();
  await expect(host.getByTestId("room-code")).toBeVisible({ timeout: 25000 });
  const code = await host.getByTestId("room-code").innerText();
  await guest.goto(`./?room=${code}${release ? `&${release}` : ""}`);
  await guest.getByLabel("YOUR CALLSIGN").fill("RIVAL");
  await guest.getByRole("button", { name: "JOIN", exact: true }).click();
  await expect(guest.getByTestId("room-code")).toHaveText(code, {
    timeout: 30000,
  });
  await expect(
    host.locator(".crew-member:not(.empty)").filter({ hasText: "RIVAL" }),
  ).toBeVisible();
  await host.screenshot({ path: path.join(evidence, "online-lobby.png") });
  await host.getByRole("button", { name: "I’M READY" }).click();
  await guest.getByRole("button", { name: "I’M READY" }).click();
  await host.getByRole("checkbox").check();
  await expect(guest.getByRole("checkbox")).toBeChecked();
  await expect(guest.getByRole("checkbox")).toBeDisabled();
  await expect(
    host.getByRole("button", { name: "START THE RIOT" }),
  ).toBeDisabled();
  await host.getByRole("button", { name: "I’M READY" }).click();
  await guest.getByRole("button", { name: "I’M READY" }).click();
  await guest.getByRole("button", { name: "Open quick messages" }).click();
  await guest.getByRole("button", { name: "Ready!", exact: true }).click();
  await expect(host.locator(".comms-feed")).toContainText("RIVAL");
  await expect(host.locator(".comms-feed")).toContainText("Ready!");
  await expect(
    host.getByRole("button", { name: "START THE RIOT" }),
  ).toBeEnabled();
  await host.getByRole("button", { name: "START THE RIOT" }).click();
  await expect(host.locator(".countdown-overlay")).toHaveCount(0, {
    timeout: 14000,
  });
  await expect(guest.locator(".arena-mount canvas")).toBeVisible();
  const label = guest.locator(".runner-label").filter({ hasText: "SHEENA" });
  const before = Number(await label.getAttribute("data-x"));
  await host.bringToFront();
  await host.keyboard.down("d");
  await host.waitForTimeout(900);
  await host.keyboard.up("d");
  await expect
    .poll(async () => Number(await label.getAttribute("data-x")) - before)
    .toBeGreaterThan(0.2);
  await driveTo(host, 0, 5); // cross the open lane before approaching the altar
  await driveTo(host, 0, 0);
  await expect(host.locator(".objective")).toContainText("DELIVER");
  await driveTo(host, 0, -7.6);
  await expect(host.locator(".score-player.local > b")).toHaveText("1");
  await expect(
    guest.locator(".score-player").filter({ hasText: "SHEENA" }).locator("b"),
  ).toHaveText("1");
  console.log(
    "Pickup and delivery synchronized. Waiting for the real final-30-second Surge.",
  );
  await guest.keyboard.press("Space");
  await expect(guest.locator(".pulse-button")).toHaveClass(/charging/);
  await guest.screenshot({ path: path.join(evidence, "online-guest.png") });
  await host.screenshot({ path: path.join(evidence, "online-host.png") });
  // Let the real three-minute clock run. Both WebRTC endpoints, inputs and
  // background timers remain on the same real clock throughout the match.
  await expect(host.locator(".surge-active")).toContainText("2× POINTS", {
    timeout: 200000,
  });
  await expect(guest.locator(".surge-active")).toContainText("2× POINTS");
  await host.screenshot({
    path: path.join(evidence, "surge.png"),
    animations: "disabled",
  });
  await expect(host.locator(".results-panel")).toBeVisible({ timeout: 45000 });
  await expect(guest.locator(".results-panel")).toBeVisible();
  await host.screenshot({
    path: path.join(evidence, "results.png"),
    animations: "disabled",
  });
  await expect(
    host.getByRole("region", { name: "Your round recap" }),
  ).toContainText("PULSES LANDED");
  await expect(host.locator(".round-reward")).toContainText("+50 RELIC SHARDS");
  await host.getByRole("button", { name: "VIEW MASTERY" }).click();
  await expect(host.getByTestId("shard-balance")).toHaveText("50");
  await host.getByRole("button", { name: "CAREER", exact: true }).click();
  await expect(
    host
      .locator(".career-grid > div")
      .filter({ hasText: "MATCHES" })
      .locator("strong"),
  ).toHaveText("1");
  await host.keyboard.press("Escape");
  await host.getByRole("button", { name: "READY FOR A REMATCH" }).click();
  await guest.getByRole("button", { name: "READY FOR A REMATCH" }).click();
  await expect(
    host.getByRole("button", { name: "ONE MORE RIOT" }),
  ).toBeEnabled();
  await host.getByRole("button", { name: "ONE MORE RIOT" }).click();
  await expect(host.locator(".countdown-overlay")).toBeVisible();
  await expect(guest.locator(".countdown-overlay")).toBeVisible();
  await hostContext.close();
  await expect(guest.getByRole("alert")).toContainText(
    /host left|connection ended|host stopped responding/i,
    { timeout: 16000 },
  );
  expect(errors).toEqual([]);
  await guestContext.close();
});

test("local career UI claims tiers, unlocks cosmetics, persists and renders an equipped crown", async ({
  browser,
}) => {
  // Explicit local-save fixture for the purchase UI, never a simulated online
  // completion. Actual earned-round persistence is checked in the online suite.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(homePath);
  await page.evaluate(() =>
    localStorage.setItem(
      "relic-riot-career-v1",
      JSON.stringify({
        version: 1,
        shards: 600,
        owned: ["classic"],
        equipped: "classic",
        totals: { deliveries: 3 },
        claimed: {},
        receipts: [],
      }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: /Open mastery/ }).click();
  await page.getByTestId("claim-courier").click();
  await expect(page.getByTestId("claim-courier")).toBeDisabled();
  await expect(page.getByTestId("shard-balance")).toHaveText("630");
  await page.getByRole("button", { name: "WARDROBE", exact: true }).click();
  await page.getByRole("button", { name: "UNLOCK · 240 ◆" }).click();
  await expect(page.getByTestId("shard-balance")).toHaveText("390");
  await expect(page.locator(".cosmetic-card.look-royal")).toContainText(
    "EQUIPPED",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: /Open mastery/ }).click();
  await expect(page.getByTestId("shard-balance")).toHaveText("390");
  await page.getByRole("button", { name: "WARDROBE", exact: true }).click();
  await expect(page.locator(".cosmetic-card.look-royal")).toContainText(
    "EQUIPPED",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(evidence, "wardrobe-mobile-fixture.png"),
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.getByRole("button", { name: /PRACTICE RUN/ }).click();
  await expect(page.locator(".runner-label.is-you.look-royal")).toBeVisible();
  await expect(page.locator(".countdown-overlay")).toHaveCount(0, {
    timeout: 12000,
  });
  await page.screenshot({
    path: path.join(evidence, "royal-cosmetic-fixture.png"),
  });
  for (const [look, cost, balance] of [
    ["gilded", 120, 270],
    ["starlight", 180, 90],
  ] as const) {
    await page.getByRole("button", { name: "LEAVE ROOM", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "LEAVE ROOM" })
      .click();
    await page.getByRole("button", { name: /Open mastery/ }).click();
    await page.getByRole("button", { name: "WARDROBE", exact: true }).click();
    await page.getByRole("button", { name: `UNLOCK · ${cost} ◆` }).click();
    await expect(page.getByTestId("shard-balance")).toHaveText(String(balance));
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /PRACTICE RUN/ }).click();
    await expect(
      page.locator(`.runner-label.is-you.look-${look}`),
    ).toBeVisible();
    await expect(page.locator(".countdown-overlay")).toHaveCount(0, {
      timeout: 12000,
    });
    await page.keyboard.down("d");
    await page.waitForTimeout(600);
    await page.keyboard.up("d");
    await page.screenshot({
      path: path.join(evidence, `${look}-cosmetic-fixture.png`),
    });
  }
  expect(errors).toEqual([]);
  await context.close();
});
