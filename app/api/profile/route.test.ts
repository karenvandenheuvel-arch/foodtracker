import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, PUT } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

describe("GET /api/profile", () => {
  it("returns the default (empty) profile row", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ weight: null, height: null, age: null, gender: "man" });
  });
});

describe("PUT /api/profile", () => {
  it("persists the updated profile fields", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({ weight: 72.5, height: 178, age: 31, gender: "vrouw" }),
    });
    const res = await PUT(req);
    expect(await res.json()).toEqual({ weight: 72.5, height: 178, age: 31, gender: "vrouw" });

    const after = await (await GET()).json();
    expect(after).toEqual({ weight: 72.5, height: 178, age: 31, gender: "vrouw" });
  });

  it("treats empty strings as null and defaults gender to man", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({ weight: "", height: "", age: "", gender: "iets anders" }),
    });
    const res = await PUT(req);
    expect(await res.json()).toEqual({ weight: null, height: null, age: null, gender: "man" });
  });
});
