import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, POST } from "../route";
import { DELETE } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

describe("DELETE /api/exercises/:id", () => {
  it("removes the session so it no longer shows up in GET", async () => {
    const postRes = await POST(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ name: "Yoga", duration: 45, weightKg: 65 }),
      })
    );
    const created = await postRes.json();

    const delRes = await DELETE(new Request("http://localhost/api/exercises/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(await delRes.json()).toEqual({ ok: true });

    const list = await (await GET(new Request("http://localhost/api/exercises"))).json();
    expect(list).toEqual([]);
  });
});
