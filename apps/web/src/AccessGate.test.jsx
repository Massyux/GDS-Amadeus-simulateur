import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessGate from "./AccessGate.jsx";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_TOKEN_STORAGE_KEY } from "./accessKey.js";
import { dictionary } from "./i18n/dictionary.js";

const TEST_KEY = "GDS-TEST-0001";

const t = dictionary.fr;

function mockActivate(response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(response), { status: 200 }))
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AccessGate", () => {
  it("rejects a key the server does not recognize", async () => {
    mockActivate({ valid: false, reason: "NOT_FOUND" });
    const user = userEvent.setup();
    const onValidated = vi.fn();
    render(<AccessGate t={t} onValidated={onValidated} />);

    await user.type(screen.getByLabelText(t.accessGate.inputLabel), "GDS-0000-0000");
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.accessGate.invalid);
    expect(onValidated).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
  });

  it("accepts a key activated by the server and stores the token", async () => {
    mockActivate({ valid: true, token: "opaque-token-123", devicesUsed: 1, maxDevices: 1 });
    const user = userEvent.setup();
    const onValidated = vi.fn();

    render(<AccessGate t={t} onValidated={onValidated} />);
    await user.type(screen.getByLabelText(t.accessGate.inputLabel), TEST_KEY);
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("1");
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe("opaque-token-123");
  });

  it("shows a distinct message when the device limit is reached", async () => {
    mockActivate({ valid: false, reason: "DEVICE_LIMIT", devicesUsed: 1, maxDevices: 1 });
    const user = userEvent.setup();
    const onValidated = vi.fn();

    render(<AccessGate t={t} onValidated={onValidated} />);
    await user.type(screen.getByLabelText(t.accessGate.inputLabel), TEST_KEY);
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.accessGate.deviceLimit);
    expect(onValidated).not.toHaveBeenCalled();
  });

  it("treats an unreachable server as an invalid key, not a crash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    const user = userEvent.setup();
    const onValidated = vi.fn();

    render(<AccessGate t={t} onValidated={onValidated} />);
    await user.type(screen.getByLabelText(t.accessGate.inputLabel), TEST_KEY);
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.accessGate.invalid);
    expect(onValidated).not.toHaveBeenCalled();
  });

  it("calls onBack when the back button is used", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<AccessGate t={t} onValidated={() => {}} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: t.accessGate.back }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
