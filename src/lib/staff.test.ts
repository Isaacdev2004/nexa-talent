import { describe, expect, it } from "vitest";
import { JOB_TRANSITIONS, slugify } from "./staff";

describe("job publishing workflow", () => {
  it("archived jobs cannot be reopened and published jobs can only close", () => {
    expect(JOB_TRANSITIONS["archived"]).toEqual([]);
    expect(JOB_TRANSITIONS["published"]).toEqual(["closed"]);
  });
  it("creates URL-safe slugs", () => {
    expect(slugify("Senior Analyst (Risk)", "São Paulo")).toMatch(/^senior-analyst-risk-sao-paulo-[a-z0-9]{1,4}$/);
  });
});
