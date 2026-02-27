import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { __queueStoreUtils } from "../index.js";

describe("queue store utils", () => {
  it("adds a record locator once and keeps insertion order", () => {
    const store = {};
    __queueStoreUtils.queueAdd(store, "12c1", "abc123");
    __queueStoreUtils.queueAdd(store, "12C1", "ABC123");
    __queueStoreUtils.queueAdd(store, "12C1", "DEF456");
    assert.deepEqual(store["12C1"], ["ABC123", "DEF456"]);
  });

  it("peeks first record locator in queue", () => {
    const store = {};
    __queueStoreUtils.queueAdd(store, "12C1", "ABC123");
    __queueStoreUtils.queueAdd(store, "12C1", "DEF456");
    const first = __queueStoreUtils.queuePeek(store, "12c1");
    assert.equal(first, "ABC123");
  });

  it("removes a record locator from queue", () => {
    const store = {};
    __queueStoreUtils.queueAdd(store, "12C1", "ABC123");
    __queueStoreUtils.queueAdd(store, "12C1", "DEF456");
    __queueStoreUtils.queueRemove(store, "12C1", "ABC123");
    assert.deepEqual(store["12C1"], ["DEF456"]);
  });
});
