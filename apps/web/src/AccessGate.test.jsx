import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessGate from "./AccessGate.jsx";
import { ACCESS_KEY_STORAGE_KEY } from "./accessKey.js";
import { dictionary } from "./i18n/dictionary.js";

const TEST_KEY = "GDS-TEST-0001";
// SHA-256 hex digest of "GDS-TEST-0001" (see lib/keyHash.test.js).
const TEST_KEY_HASH =
  "f422821e3d707a6557c0b112a856927c754b5ca0842cb44503e6e028aa539a16";

const t = dictionary.fr;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AccessGate", () => {
  it("rejects an invalid key when neither the server nor the fallback recognize it", async () => {
    const user = userEvent.setup();
    const onValidated = vi.fn();
    render(<AccessGate t={t} onValidated={onValidated} />);

    await user.type(screen.getByLabelText(t.accessGate.inputLabel), "GDS-0000-0000");
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.accessGate.invalid);
    expect(onValidated).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
  });

  it("accepts a key validated by the server (primary path)", async () => {
    const user = userEvent.setup();
    const onValidated = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ valid: true }), { status: 200 })
      )
    );

    render(<AccessGate t={t} onValidated={onValidated} />);
    await user.type(screen.getByLabelText(t.accessGate.inputLabel), TEST_KEY);
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("1");
  });

  it("falls back to the client-side hash list when the server is unreachable", async () => {
    vi.stubEnv("VITE_FALLBACK_KEY_HASHES", TEST_KEY_HASH);
    const user = userEvent.setup();
    const onValidated = vi.fn();

    render(<AccessGate t={t} onValidated={onValidated} />);
    // normalization: lowercase + surrounding whitespace must still match.
    await user.type(screen.getByLabelText(t.accessGate.inputLabel), `  ${TEST_KEY.toLowerCase()}  `);
    await user.click(screen.getByRole("button", { name: t.accessGate.submit }));

    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("1");
  });

  it("does not accept any key when the fallback list is empty and the server is unreachable", async () => {
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
