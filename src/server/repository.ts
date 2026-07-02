import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { GameAction } from "../domain/actions";
import { applyGameAction } from "../domain/reducer";
import type { GameStateV1 } from "../domain/types";

export interface SessionRecord {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ActionResult {
  state: GameStateV1;
  deduped: boolean;
}

export interface GameRepository {
  getState(userId: string): Promise<GameStateV1 | null>;
  saveInitialState(userId: string, state: GameStateV1): Promise<void>;
  applyAction(userId: string, action: GameAction): Promise<ActionResult>;
  createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  findSession(tokenHash: string): Promise<SessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
  resetUser(userId: string): Promise<void>;
}

function copyState(state: GameStateV1): GameStateV1 {
  return structuredClone(state);
}

export class MemoryGameRepository implements GameRepository {
  private readonly states = new Map<string, GameStateV1>();
  private readonly sessions = new Map<string, SessionRecord>();

  async getState(userId: string): Promise<GameStateV1 | null> {
    const state = this.states.get(userId);
    return state === undefined ? null : copyState(state);
  }

  async saveInitialState(
    userId: string,
    state: GameStateV1,
  ): Promise<void> {
    if (!this.states.has(userId)) {
      this.states.set(userId, copyState(state));
    }
  }

  async applyAction(
    userId: string,
    action: GameAction,
  ): Promise<ActionResult> {
    const state = this.states.get(userId);
    if (state === undefined) {
      throw new Error("STATE_NOT_FOUND");
    }
    if (state.processedActionIds.includes(action.id)) {
      return { state: copyState(state), deduped: true };
    }

    const nextState = applyGameAction(state, action);
    this.states.set(userId, nextState);
    return { state: copyState(nextState), deduped: false };
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    this.sessions.set(tokenHash, {
      userId,
      tokenHash,
      expiresAt: new Date(expiresAt),
    });
  }

  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(tokenHash);
    return session === undefined
      ? null
      : { ...session, expiresAt: new Date(session.expiresAt) };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async resetUser(userId: string): Promise<void> {
    this.states.delete(userId);
    for (const [tokenHash, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(tokenHash);
      }
    }
  }
}

interface FileSnapshot {
  users: Record<string, { id: string }>;
  sessions: Record<
    string,
    { userId: string; tokenHash: string; expiresAt: string }
  >;
  states: Record<string, GameStateV1>;
}

function emptySnapshot(): FileSnapshot {
  return { users: {}, sessions: {}, states: {} };
}

export class FileGameRepository implements GameRepository {
  private readonly snapshot: Promise<FileSnapshot>;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {
    this.snapshot = this.load();
  }

  private async load(): Promise<FileSnapshot> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as FileSnapshot;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return emptySnapshot();
      }
      throw error;
    }
  }

  private enqueue<T>(
    operation: (snapshot: FileSnapshot) => T | Promise<T>,
  ): Promise<T> {
    const result = this.writeQueue.then(async () => {
      const snapshot = await this.snapshot;
      const value = await operation(snapshot);
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(
        this.filePath,
        `${JSON.stringify(snapshot, null, 2)}\n`,
        "utf8",
      );
      return value;
    });
    this.writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async getState(userId: string): Promise<GameStateV1 | null> {
    await this.writeQueue;
    const state = (await this.snapshot).states[userId];
    return state === undefined ? null : copyState(state);
  }

  async saveInitialState(
    userId: string,
    state: GameStateV1,
  ): Promise<void> {
    await this.enqueue((snapshot) => {
      if (snapshot.states[userId] === undefined) {
        snapshot.users[userId] = { id: userId };
        snapshot.states[userId] = copyState(state);
      }
    });
  }

  async applyAction(
    userId: string,
    action: GameAction,
  ): Promise<ActionResult> {
    return this.enqueue((snapshot) => {
      const state = snapshot.states[userId];
      if (state === undefined) {
        throw new Error("STATE_NOT_FOUND");
      }
      if (state.processedActionIds.includes(action.id)) {
        return { state: copyState(state), deduped: true };
      }

      const nextState = applyGameAction(state, action);
      snapshot.states[userId] = nextState;
      return { state: copyState(nextState), deduped: false };
    });
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.enqueue((snapshot) => {
      snapshot.sessions[tokenHash] = {
        userId,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    await this.writeQueue;
    const session = (await this.snapshot).sessions[tokenHash];
    return session === undefined
      ? null
      : { ...session, expiresAt: new Date(session.expiresAt) };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.enqueue((snapshot) => {
      delete snapshot.sessions[tokenHash];
    });
  }

  async resetUser(userId: string): Promise<void> {
    await this.enqueue((snapshot) => {
      delete snapshot.users[userId];
      delete snapshot.states[userId];
      for (const [tokenHash, session] of Object.entries(snapshot.sessions)) {
        if (session.userId === userId) {
          delete snapshot.sessions[tokenHash];
        }
      }
    });
  }
}
