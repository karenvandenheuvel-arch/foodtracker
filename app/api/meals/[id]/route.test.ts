import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { GET, POST } from "../route";
import { DELETE, PUT } from "./route";

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

async function createMeal() {
  const postRes = await POST(
    new Request("http://localhost/api/meals", { method: "POST", body: JSON.stringify(validMealBody) })
  );
  return postRes.json();
}

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

describe("PUT /api/meals/:id", () => {
  it("recalculates totals from the given items and persists the note", async () => {
    const created = await createMeal();

    const putRes = await PUT(
      new Request(`http://localhost/api/meals/${created.id}`, {
        method: "PUT",
        body: JSON.stringify({
          note: "Aangepast",
          items: [
            { name: "Kipfilet", group: "Eiwitbronnen", kcal: 200, protein: 20, carbs: 0, fat: 5, source: "database" },
            { name: "Rijst", group: "Granen", kcal: 150, protein: 3, carbs: 30, fat: 1, source: "schatting" },
          ],
        }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) }
    );
    expect(putRes.status).toBe(200);
    const updated = await putRes.json();
    expect(updated.note).toBe("Aangepast");
    expect(updated.kcal).toBe(350);
    expect(updated.protein).toBe(23);
    expect(updated.items).toHaveLength(2);

    const list = await (await GET(new Request("http://localhost/api/meals"))).json();
    expect(list[0].kcal).toBe(350);
    expect(list[0].note).toBe("Aangepast");
  });

  it("rejects an update without any items", async () => {
    const created = await createMeal();

    const putRes = await PUT(
      new Request(`http://localhost/api/meals/${created.id}`, {
        method: "PUT",
        body: JSON.stringify({ note: "leeg", items: [] }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) }
    );
    expect(putRes.status).toBe(400);
  });

  it("returns 404 for a meal that doesn't exist", async () => {
    const putRes = await PUT(
      new Request("http://localhost/api/meals/999", {
        method: "PUT",
        body: JSON.stringify({ note: "x", items: [validMealBody.items[0]] }),
      }),
      { params: Promise.resolve({ id: "999" }) }
    );
    expect(putRes.status).toBe(404);
  });
});
