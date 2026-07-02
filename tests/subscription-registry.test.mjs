import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { transform } from "esbuild";

const source = await readFile(new URL("../src/services/subscriptionRegistry.ts", import.meta.url), "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm", target: "es2020" });
const { createSubscriptionRegistry } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`);

test("une même clé ne crée qu'une souscription et diffuse à tous les écouteurs", () => {
  const registry = createSubscriptionRegistry();
  let connections = 0;
  let disconnections = 0;
  let notify = () => undefined;
  let firstCalls = 0;
  let secondCalls = 0;
  const connect = (nextNotify) => {
    connections += 1;
    notify = nextNotify;
    return () => { disconnections += 1; };
  };

  const unsubscribeFirst = registry.subscribe("conversation:1", () => { firstCalls += 1; }, connect);
  const unsubscribeSecond = registry.subscribe("conversation:1", () => { secondCalls += 1; }, connect);
  assert.equal(connections, 1);
  assert.equal(registry.size(), 1);

  notify();
  assert.equal(firstCalls, 1);
  assert.equal(secondCalls, 1);

  unsubscribeFirst();
  assert.equal(disconnections, 0);
  unsubscribeSecond();
  assert.equal(disconnections, 1);
  assert.equal(registry.size(), 0);
});

test("deux conversations utilisent deux souscriptions indépendantes", () => {
  const registry = createSubscriptionRegistry();
  let connections = 0;
  const connect = () => { connections += 1; return () => undefined; };
  const stopA = registry.subscribe("conversation:a", () => undefined, connect);
  const stopB = registry.subscribe("conversation:b", () => undefined, connect);
  assert.equal(connections, 2);
  assert.equal(registry.size(), 2);
  stopA();
  stopB();
});
