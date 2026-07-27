import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startTestServer, TEST_ADMIN_SECRET } from "./testServer.js";

let server;
let adminToken;

async function post(path, body, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function patch(path, body, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function del(path, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

async function get(path, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

async function createLicense(overrides = {}) {
  const { body } = await post(
    "/api/admin/licenses",
    { tier: "individual", clientName: "Test", ...overrides },
    adminToken
  );
  return body; // { key, license }
}

describe("Mission 14 -- license API (real wrangler pages dev + local D1)", { timeout: 60000 }, () => {
  before(async () => {
    server = await startTestServer();
    const login = await post("/api/admin/login", { secret: TEST_ADMIN_SECRET });
    adminToken = login.body.token;
    assert.ok(adminToken, "admin login must succeed with the test secret");
  });

  after(async () => {
    await server.stop();
  });

  describe("admin auth", () => {
    it("rejects a wrong admin secret", async () => {
      const { body } = await post("/api/admin/login", { secret: "not-it" });
      assert.equal(body.valid, false);
    });

    it("rejects admin API calls without a token", async () => {
      const { status, body } = await get("/api/admin/licenses");
      assert.equal(status, 401);
      assert.equal(body.error, "UNAUTHORIZED");
    });

    it("rejects admin API calls with a malformed token", async () => {
      const { status } = await get("/api/admin/licenses", "garbage");
      assert.equal(status, 401);
    });
  });

  describe("license creation (admin)", () => {
    it("creates an individual license with max_devices=1 by default", async () => {
      const { key, license } = await createLicense({ tier: "individual" });
      assert.match(key, /^GDS-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      assert.equal(license.tier, "individual");
      assert.equal(license.maxDevices, 1);
      assert.equal(license.devicesUsed, 0);
      assert.equal(license.status, "active");
    });

    it("creates a school license and clamps maxDevices to [2,4]", async () => {
      const tooLow = await createLicense({ tier: "school", maxDevices: 1 });
      assert.equal(tooLow.license.maxDevices, 2);

      const tooHigh = await createLicense({ tier: "school", maxDevices: 99 });
      assert.equal(tooHigh.license.maxDevices, 4);

      const inRange = await createLicense({ tier: "school", maxDevices: 3 });
      assert.equal(inRange.license.maxDevices, 3);
    });
  });

  describe("activation -- individual license (1 device)", () => {
    it("activates the first device, refuses the second, is idempotent for the first", async () => {
      const { key } = await createLicense({ tier: "individual", clientName: "Solo" });

      const first = await post("/api/license/activate", { key, deviceFingerprint: "device-A" });
      assert.equal(first.body.valid, true);
      assert.equal(first.body.devicesUsed, 1);
      assert.equal(first.body.maxDevices, 1);
      const token = first.body.token;

      const second = await post("/api/license/activate", { key, deviceFingerprint: "device-B" });
      assert.equal(second.body.valid, false);
      assert.equal(second.body.reason, "DEVICE_LIMIT");
      assert.equal(second.body.devicesUsed, 1);

      const again = await post("/api/license/activate", { key, deviceFingerprint: "device-A" });
      assert.equal(again.body.valid, true);
      assert.equal(again.body.token, token, "re-activating the same device returns the same token");
      assert.equal(again.body.devicesUsed, 1, "must not consume a second slot");
    });
  });

  describe("activation -- school license (4 devices)", () => {
    it("activates 4 devices OK, refuses the 5th", async () => {
      const { key } = await createLicense({ tier: "school", maxDevices: 4, clientName: "Ecole" });

      for (const device of ["d1", "d2", "d3", "d4"]) {
        const { body } = await post("/api/license/activate", { key, deviceFingerprint: device });
        assert.equal(body.valid, true, `${device} should activate`);
      }

      const fifth = await post("/api/license/activate", { key, deviceFingerprint: "d5" });
      assert.equal(fifth.body.valid, false);
      assert.equal(fifth.body.reason, "DEVICE_LIMIT");
      assert.equal(fifth.body.devicesUsed, 4);
    });
  });

  describe("activation -- unknown/invalid key", () => {
    it("returns NOT_FOUND for a key that was never issued", async () => {
      const { body } = await post("/api/license/activate", {
        key: "GDS-0000-0000",
        deviceFingerprint: "device-X",
      });
      assert.equal(body.valid, false);
      assert.equal(body.reason, "NOT_FOUND");
    });

    it("returns NOT_FOUND (not a distinct reason) for a revoked key -- doesn't leak that it once existed", async () => {
      const { key, license } = await createLicense({ tier: "individual", clientName: "ToRevoke" });
      await patch(`/api/admin/licenses/${license.id}`, { status: "revoked" }, adminToken);

      const { body } = await post("/api/license/activate", { key, deviceFingerprint: "device-Y" });
      assert.equal(body.valid, false);
      assert.equal(body.reason, "NOT_FOUND");
    });
  });

  describe("check", () => {
    it("confirms a freshly-activated token is valid", async () => {
      const { key } = await createLicense({ tier: "individual", clientName: "CheckMe" });
      const { body: activation } = await post("/api/license/activate", {
        key,
        deviceFingerprint: "device-Z",
      });

      const { body } = await post("/api/license/check", { token: activation.token });
      assert.equal(body.valid, true);
    });

    it("returns invalid for a made-up token", async () => {
      const { body } = await post("/api/license/check", { token: "not-a-real-token" });
      assert.equal(body.valid, false);
    });

    it("invalidates every token instantly when the license is revoked", async () => {
      const { key, license } = await createLicense({ tier: "individual", clientName: "RevokeMe" });
      const { body: activation } = await post("/api/license/activate", {
        key,
        deviceFingerprint: "device-R",
      });
      assert.equal((await post("/api/license/check", { token: activation.token })).body.valid, true);

      await patch(`/api/admin/licenses/${license.id}`, { status: "revoked" }, adminToken);

      const after = await post("/api/license/check", { token: activation.token });
      assert.equal(after.body.valid, false);
    });

    it("reactivating a revoked license restores its tokens", async () => {
      const { key, license } = await createLicense({ tier: "individual", clientName: "Toggle" });
      const { body: activation } = await post("/api/license/activate", {
        key,
        deviceFingerprint: "device-T",
      });
      await patch(`/api/admin/licenses/${license.id}`, { status: "revoked" }, adminToken);
      assert.equal(
        (await post("/api/license/check", { token: activation.token })).body.valid,
        false
      );

      await patch(`/api/admin/licenses/${license.id}`, { status: "active" }, adminToken);
      assert.equal(
        (await post("/api/license/check", { token: activation.token })).body.valid,
        true
      );
    });
  });

  describe("admin: license list, extend, free a device slot", () => {
    it("lists licenses with device usage", async () => {
      const { key, license } = await createLicense({ tier: "individual", clientName: "ListMe" });
      await post("/api/license/activate", { key, deviceFingerprint: "device-L" });

      const { body } = await get("/api/admin/licenses", adminToken);
      const found = body.licenses.find((l) => l.id === license.id);
      assert.ok(found);
      assert.equal(found.devicesUsed, 1);
      assert.ok(found.lastActivity, "lastActivity should be set after an activation");
    });

    it("reports lastActivity as null for a license with no activations yet", async () => {
      const { license } = await createLicense({ tier: "individual", clientName: "NeverUsed" });
      const { body } = await get("/api/admin/licenses", adminToken);
      const found = body.licenses.find((l) => l.id === license.id);
      assert.equal(found.lastActivity, null);
    });

    it("extends a school license's device limit", async () => {
      const { license } = await createLicense({ tier: "school", maxDevices: 2, clientName: "Extend" });
      const { body } = await patch(`/api/admin/licenses/${license.id}`, { maxDevices: 4 }, adminToken);
      assert.equal(body.ok, true);

      const list = await get("/api/admin/licenses", adminToken);
      const updated = list.body.licenses.find((l) => l.id === license.id);
      assert.equal(updated.maxDevices, 4);
    });

    it("frees a single device slot without revoking the whole license", async () => {
      const { key, license } = await createLicense({ tier: "individual", clientName: "FreeSlot" });
      await post("/api/license/activate", { key, deviceFingerprint: "device-F1" });

      const activations = await get(`/api/admin/licenses/${license.id}/activations`, adminToken);
      assert.equal(activations.body.activations.length, 1);
      const activationId = activations.body.activations[0].id;

      const blocked = await post("/api/license/activate", { key, deviceFingerprint: "device-F2" });
      assert.equal(blocked.body.reason, "DEVICE_LIMIT");

      await del(`/api/admin/activations/${activationId}`, adminToken);

      const freed = await post("/api/license/activate", { key, deviceFingerprint: "device-F2" });
      assert.equal(freed.body.valid, true, "the freed slot should now be available");
    });

    it("returns NOT_FOUND when revoking a license id that doesn't exist", async () => {
      const { status, body } = await patch("/api/admin/licenses/999999", { status: "revoked" }, adminToken);
      assert.equal(status, 404);
      assert.equal(body.error, "NOT_FOUND");
    });
  });
});
