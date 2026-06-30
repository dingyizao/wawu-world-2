import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { GameAction } from "../domain/actions";
import { createInitialState } from "../domain/state";
import {
  FileGameRepository,
  MemoryGameRepository,
} from "./repository";
import {
  createAuthenticatedSession,
  SESSION_COOKIE_NAME,
} from "./session";

const temporaryDirectories: string[] = [];

function claimAction(id: string, steps = 100): GameAction {
  return {
    id,
    type: "CLAIM_WALK_SHARDS",
    createdAt: "2026-06-30T00:00:00.000Z",
    payload: { steps },
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("MemoryGameRepository", () => {
  it("deduplicates actions without advancing state twice", async () => {
    const repository = new MemoryGameRepository();
    await repository.saveInitialState("user-1", createInitialState("user-1"));

    const first = await repository.applyAction(
      "user-1",
      claimAction("same"),
    );
    const second = await repository.applyAction(
      "user-1",
      claimAction("same"),
    );

    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.state.revision).toBe(1);
    expect(second.state.wallet.memoryShards).toBe(1);
  });
});

describe("FileGameRepository", () => {
  it("round trips states and sessions from one JSON snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wawu-repository-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "state.json");
    const first = new FileGameRepository(filePath);
    const expiresAt = new Date("2026-07-30T00:00:00.000Z");

    await first.saveInitialState("user-1", createInitialState("user-1"));
    await first.applyAction("user-1", claimAction("walk-1", 300));
    await first.createSession("user-1", "stored-token-hash", expiresAt);

    const second = new FileGameRepository(filePath);

    expect((await second.getState("user-1"))?.wallet.memoryShards).toBe(3);
    expect(await second.findSession("stored-token-hash")).toEqual({
      userId: "user-1",
      tokenHash: "stored-token-hash",
      expiresAt,
    });
  });

  it("never writes a plaintext session token to disk", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wawu-repository-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "state.json");
    const repository = new FileGameRepository(filePath);
    let plaintextToken = "";

    await repository.saveInitialState(
      "user-1",
      createInitialState("user-1"),
    );
    await createAuthenticatedSession(
      repository,
      {
        get: () => undefined,
        set: (name, value) => {
          if (name === SESSION_COOKIE_NAME) {
            plaintextToken = value;
          }
        },
      },
      "user-1",
      { now: new Date("2026-06-30T00:00:00.000Z") },
    );

    const snapshot = await readFile(filePath, "utf8");
    expect(plaintextToken.length).toBeGreaterThanOrEqual(43);
    expect(snapshot).not.toContain(plaintextToken);
    expect(snapshot).toContain("2026-07-30T00:00:00.000Z");
  });
});
