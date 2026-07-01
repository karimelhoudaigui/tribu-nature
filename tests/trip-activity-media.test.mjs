import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { transform } from "esbuild";

const source = await readFile(new URL("../src/services/tripActivityMediaService.ts", import.meta.url), "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm", target: "es2020" });
const { getActivityImageRotation } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`);

test("les photos importées sont utilisées avant l'image de secours", () => {
  assert.deepEqual(
    getActivityImageRotation(["photo-1", "photo-2", "photo-3"], "fallback", 0),
    ["photo-1", "photo-2", "photo-3", "fallback"]
  );
});

test("chaque activité reçoit une photo principale différente", () => {
  const photos = ["photo-1", "photo-2", "photo-3"];
  assert.equal(getActivityImageRotation(photos, "photo-1", 0)[0], "photo-1");
  assert.equal(getActivityImageRotation(photos, "photo-1", 1)[0], "photo-2");
  assert.equal(getActivityImageRotation(photos, "photo-1", 2)[0], "photo-3");
});

test("les doublons et valeurs vides sont éliminés", () => {
  assert.deepEqual(getActivityImageRotation(["photo-1", "", "photo-1"], "photo-1", 0), ["photo-1"]);
});
