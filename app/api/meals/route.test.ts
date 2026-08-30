import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, POST } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

const validMealBody = {
  note: "Lunch",
  photo: "data:image/png;base64,AAA=",
  kcal: 450,
  protein: 20,
  carbs: 50,
  fat: 15,
  confidence: "hoog",
  items: [
    { name: "Kipfilet", group: "Eiwitbronnen", kcal: 250, protein: 18, carbs: 0, fat: 8, source: "database" },
  ],
};

describe("GET /api/meals", () => {
  it("returns an empty list when there are no meals for today", async () => {
    const res = await GET(new Request("http://localhost/api/meals"));
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/meals", () => {
  it("rejects a meal without a photo or items array", async () => {
    const res = await POST(
      new Request("http://localhost/api/meals", { method: "POST", body: JSON.stringify({ items: [] }) })
    );
    expect(res.status).toBe(400);
  });

  it("persists a valid meal and round-trips it through GET", async () => {
    const postRes = await POST(
      new Request("http://localhost/api/meals", { method: "POST", body: JSON.stringify(validMealBody) })
    );
    expect(postRes.status).toBe(201);
    const created = await postRes.json();
    expect(created.note).toBe("Lunch");
    expect(created.items).toEqual(validMealBody.items);

    const listRes = await GET(new Request("http://localhost/api/meals"));
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].items).toEqual(validMealBody.items);
  });

  it("accepts a text-logged meal without a photo", async () => {
    const { photo, ...withoutPhoto } = validMealBody;
    void photo;
    const res = await POST(
      new Request("http://localhost/api/meals", { method: "POST", body: JSON.stringify(withoutPhoto) })
    );
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.photo).toBe("");
    expect(created.items).toEqual(withoutPhoto.items);
  });
});
