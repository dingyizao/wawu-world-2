import { describe, expect, it } from "vitest";

import { FileGameRepository } from "./repository";
import {
  createGameRepository,
  PostgresGameRepository,
} from "./storage";

describe("storage selection", () => {
  it("uses file storage only for development", () => {
    expect(
      createGameRepository({
        NODE_ENV: "development",
        WAWU_STORAGE_DRIVER: "file",
        WAWU_DATA_FILE: ".data/test.json",
      }),
    ).toBeInstanceOf(FileGameRepository);

    expect(() =>
      createGameRepository({
        NODE_ENV: "production",
        WAWU_STORAGE_DRIVER: "file",
      }),
    ).toThrow("FILE_STORAGE_IS_DEVELOPMENT_ONLY");
  });

  it("selects PostgreSQL for Coze or a supported database URL", () => {
    expect(
      createGameRepository({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://example.invalid/wawu",
      }),
    ).toBeInstanceOf(PostgresGameRepository);

    expect(() =>
      createGameRepository({
        NODE_ENV: "production",
        WAWU_STORAGE_DRIVER: "coze",
      }),
    ).toThrow("DATABASE_URL_REQUIRED");
  });
});
