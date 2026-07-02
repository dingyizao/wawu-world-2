import postgres, { type Sql } from "postgres";

import type { GameAction } from "../domain/actions";
import { applyGameAction } from "../domain/reducer";
import type { GameStateV1 } from "../domain/types";
import {
  FileGameRepository,
  type ActionResult,
  type GameRepository,
  type SessionRecord,
} from "./repository";

function isLocalDatabase(url: string): boolean {
  const hostname = new URL(url).hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function asState(value: unknown): GameStateV1 {
  return (
    typeof value === "string" ? JSON.parse(value) : value
  ) as GameStateV1;
}

function asJsonValue(value: unknown): postgres.JSONValue {
  return JSON.parse(JSON.stringify(value)) as postgres.JSONValue;
}

export class PostgresGameRepository implements GameRepository {
  private readonly sql: Sql;
  private schemaReady: Promise<void> | undefined;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {
      max: 5,
      prepare: false,
      ssl: isLocalDatabase(databaseUrl) ? false : "require",
    });
  }

  private ensureSchema(): Promise<void> {
    this.schemaReady ??= this.initializeSchema();
    return this.schemaReady;
  }

  private async initializeSchema(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS game_saves (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        schema_version INTEGER NOT NULL,
        revision INTEGER NOT NULL,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS game_actions (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_id TEXT NOT NULL,
        action JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, action_id)
      )
    `;
  }

  async getState(userId: string): Promise<GameStateV1 | null> {
    await this.ensureSchema();
    const rows = await this.sql`
      SELECT state
      FROM game_saves
      WHERE user_id = ${userId}
    `;
    return rows.length === 0 ? null : asState(rows[0].state);
  }

  async saveInitialState(
    userId: string,
    state: GameStateV1,
  ): Promise<void> {
    await this.ensureSchema();
    await this.sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO users (id)
        VALUES (${userId})
        ON CONFLICT (id) DO NOTHING
      `;
      await transaction`
        INSERT INTO game_saves (
          user_id,
          schema_version,
          revision,
          state
        )
        VALUES (
          ${userId},
          ${state.schemaVersion},
          ${state.revision},
          ${transaction.json(asJsonValue(state))}
        )
        ON CONFLICT (user_id) DO NOTHING
      `;
    });
  }

  async applyAction(
    userId: string,
    action: GameAction,
  ): Promise<ActionResult> {
    await this.ensureSchema();
    return this.sql.begin(async (transaction) => {
      const rows = await transaction`
        SELECT state
        FROM game_saves
        WHERE user_id = ${userId}
        FOR UPDATE
      `;
      if (rows.length === 0) {
        throw new Error("STATE_NOT_FOUND");
      }

      const state = asState(rows[0].state);
      const inserted = await transaction`
        INSERT INTO game_actions (user_id, action_id, action)
        VALUES (
          ${userId},
          ${action.id},
          ${transaction.json(asJsonValue(action))}
        )
        ON CONFLICT (user_id, action_id) DO NOTHING
        RETURNING action_id
      `;
      if (inserted.length === 0) {
        return { state, deduped: true };
      }

      const nextState = applyGameAction(state, action);
      await transaction`
        UPDATE game_saves
        SET
          state = ${transaction.json(asJsonValue(nextState))},
          schema_version = ${nextState.schemaVersion},
          revision = ${nextState.revision},
          updated_at = NOW()
        WHERE user_id = ${userId}
      `;
      return { state: nextState, deduped: false };
    });
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.ensureSchema();
    await this.sql`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES (${tokenHash}, ${userId}, ${expiresAt})
      ON CONFLICT (token_hash) DO UPDATE
      SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
    `;
  }

  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    await this.ensureSchema();
    const rows = await this.sql`
      SELECT user_id, token_hash, expires_at
      FROM sessions
      WHERE token_hash = ${tokenHash}
    `;
    if (rows.length === 0) {
      return null;
    }
    return {
      userId: String(rows[0].user_id),
      tokenHash: String(rows[0].token_hash),
      expiresAt: new Date(rows[0].expires_at as string | Date),
    };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.ensureSchema();
    await this.sql`
      DELETE FROM sessions
      WHERE token_hash = ${tokenHash}
    `;
  }
}

type StorageEnvironment = Record<string, string | undefined>;

function databaseUrl(environment: StorageEnvironment): string | null {
  for (const name of [
    "DATABASE_URL",
    "POSTGRES_URL",
    "PGDATABASE_URL",
    "WAWU_DATABASE_URL",
    "COZE_DATABASE_URL",
  ]) {
    const value = environment[name];
    if (
      value !== undefined &&
      (value.startsWith("postgres://") ||
        value.startsWith("postgresql://"))
    ) {
      return value;
    }
  }
  return null;
}

export function createGameRepository(
  environment: StorageEnvironment = process.env,
): GameRepository {
  const url = databaseUrl(environment);
  if (url !== null) {
    return new PostgresGameRepository(url);
  }
  if (
    environment.WAWU_STORAGE_DRIVER === "coze" ||
    environment.WAWU_STORAGE_DRIVER === "postgres"
  ) {
    throw new Error("DATABASE_URL_REQUIRED");
  }
  if (environment.NODE_ENV === "production") {
    throw new Error("FILE_STORAGE_IS_DEVELOPMENT_ONLY");
  }
  return new FileGameRepository(
    environment.WAWU_DATA_FILE ?? ".data/wawu-world-2.json",
  );
}

const repositoryGlobal = globalThis as typeof globalThis & {
  __wawuGameRepository?: GameRepository;
};

export function getGameRepository(): GameRepository {
  repositoryGlobal.__wawuGameRepository ??= createGameRepository();
  return repositoryGlobal.__wawuGameRepository;
}
