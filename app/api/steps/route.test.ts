import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, PUT } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

describe("GET /api/steps", () => {
  it("returns 0 steps for a date with no record", async () => {
    const req = new Request("http://localhost/api/steps?date=2026-01-01");
    const res = await GET(req);
    expect(await res.json()).toEqual({ date: "2026-01-01", steps: 0 });
  });
});

describe("PUT /api/steps", () => {
  it("upserts steps for today and clamps negative values to 0", async () => {
    const put = async (steps: unknown) =>
      PUT(new Request("http://localhost/api/steps", { method: "PUT", body: JSON.stringify({ steps }) }));

    const res1 = await put(4200);
    const body1 = await res1.json();
    expect(body1.steps).toBe(4200);

    // second PUT on the same day overwrites rather than duplicating
    const res2 = await put(-50);
    const body2 = await res2.json();
    expect(body2.steps).toBe(0);
    expect(body2.date).toBe(body1.date);
  });

  it("upserts steps for a past date when one is supplied", async () => {
    const res = await PUT(
      new Request("http://localhost/api/steps", {
        method: "PUT",
        body: JSON.stringify({ steps: 3000, date: "2026-01-01" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ date: "2026-01-01", steps: 3000 });

    const getRes = await GET(new Request("http://localhost/api/steps?date=2026-01-01"));
    expect(await getRes.json()).toEqual({ date: "2026-01-01", steps: 3000 });
  });

  it("rejects a date in the future", async () => {
    const res = await PUT(
      new Request("http://localhost/api/steps", {
        method: "PUT",
        body: JSON.stringify({ steps: 1000, date: "2999-01-01" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
