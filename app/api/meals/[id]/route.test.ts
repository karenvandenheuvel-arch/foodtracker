import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, POST } from "../route";
import { DELETE } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

describe("DELETE /api/meals/:id", () => {
  it("removes the meal so it no longer shows up in GET", async () => {
    const postRes = await POST(
      new Request("http://localhost/api/meals", {
        method: "POST",
        body: JSON.stringify({
          photo: "data:image/png;base64,AAA=",
          kcal: 100,
          protein: 1,
          carbs: 1,
          fat: 1,
          confidence: "laag",
          items: [],
        }),
      })
    );
    const created = await postRes.json();

    const delRes = await DELETE(new Request("http://localhost/api/meals/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(await delRes.json()).toEqual({ ok: true });

    const list = await (await GET(new Request("http://localhost/api/meals"))).json();
    expect(list).toEqual([]);
  });
});
