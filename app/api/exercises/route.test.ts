import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, POST } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

describe("GET /api/exercises", () => {
  it("returns an empty list when there are no sessions for today", async () => {
    const res = await GET(new Request("http://localhost/api/exercises"));
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/exercises", () => {
  it("rejects an unknown exercise type", async () => {
    const res = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Onbestaand", duration: 30, weightKg: 70 }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-positive duration", async () => {
    const res = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Hardlopen", duration: 0, weightKg: 70 }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("computes and persists kcal for a valid session", async () => {
    const res = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Hardlopen", duration: 30, weightKg: 70 }),
      })
    );
    expect(res.status).toBe(201);
    const created = await res.json();
    // 9.8 * 3.5 * 70 / 200 * 30 = 359.8 -> 360
    expect(created.kcal).toBe(360);
    expect(created.name).toBe("Hardlopen");

    const list = await (await GET(new Request("http://localhost/api/exercises"))).json();
    expect(list).toHaveLength(1);
  });

  it("defaults weight to 70kg when not provided", async () => {
    const res = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Hardlopen", duration: 30 }),
      })
    );
    const created = await res.json();
    expect(created.kcal).toBe(360);
  });

  it("accepts the new Crosstrainer and Roeitrainer exercise types", async () => {
    for (const name of ["Crosstrainer", "Roeitrainer"]) {
      const res = await POST(
        new Request("http://localhost/api/exercises", {
          method: "POST",
          body: JSON.stringify({ name, duration: 30, weightKg: 70 }),
        })
      );
      expect(res.status).toBe(201);
      expect((await res.json()).name).toBe(name);
    }
  });

  it("logs a session against a past date when one is supplied", async () => {
    const res = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Hardlopen", duration: 30, weightKg: 70, date: "2026-01-01" }),
      })
    );
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.date).toBe("2026-01-01");

    const list = await (await GET(new Request("http://localhost/api/exercises?date=2026-01-01"))).json();
    expect(list).toHaveLength(1);
  });

  it("rejects a date in the future", async () => {
    const res = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Hardlopen", duration: 30, weightKg: 70, date: "2999-01-01" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
