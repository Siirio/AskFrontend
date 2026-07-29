import assert from "node:assert/strict";
import test from "node:test";

test("platform cabinet exposes exactly five primary sections", async () => {
  const { PLATFORM_NAVIGATION } = await import("../src/widgets/PlatformShell/platformTypes.ts");

  assert.deepEqual(
    PLATFORM_NAVIGATION.map(item => item.section),
    ["summary", "businesses", "chats", "accounts", "team"],
  );
});

test("platform chat workspace exposes support, managed import, and ordinary tabs", async () => {
  const { PLATFORM_CHAT_TABS } = await import("../src/widgets/PlatformShell/platformTypes.ts");

  assert.deepEqual(
    PLATFORM_CHAT_TABS.map(item => item.type),
    ["PLATFORM_SUPPORT", "MANAGED_IMPORT", "GENERAL_SUPPORT"],
  );
});
