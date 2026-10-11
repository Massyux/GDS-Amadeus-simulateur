import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthScreen from "./AuthScreen.jsx";
import { dictionary } from "../i18n/dictionary.js";

const t = dictionary.fr;

function mockFetch(router) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, opts) => {
      const body = router(String(url), opts);
      return new Response(JSON.stringify(body), { status: 200 });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthScreen", () => {
  it("logs in and reports the user + csrf token up", async () => {
    mockFetch((url) => {
      if (url.includes("/api/auth/login")) return { ok: true };
      if (url.includes("/api/auth/me")) return { user: { id: 1, email: "a@b.com" }, csrfToken: "csrf-1" };
      return {};
    });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthScreen t={t} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText(t.platform.auth.email), "a@b.com");
    await user.type(screen.getByLabelText(t.platform.auth.password), "un-mot-de-passe-solide");
    await user.click(screen.getByRole("button", { name: t.platform.auth.loginSubmit }));

    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith({ id: 1, email: "a@b.com" }, "csrf-1")
    );
  });

  it("shows the server's error message on a failed login", async () => {
    mockFetch((url) => {
      if (url.includes("/api/auth/login")) return { ok: false, error: "Adresse e-mail ou mot de passe incorrect." };
      return {};
    });
    const user = userEvent.setup();
    render(<AuthScreen t={t} onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText(t.platform.auth.email), "a@b.com");
    await user.type(screen.getByLabelText(t.platform.auth.password), "mauvais");
    await user.click(screen.getByRole("button", { name: t.platform.auth.loginSubmit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/);
  });

  it("toggles to register mode and shows the name fields", async () => {
    const user = userEvent.setup();
    render(<AuthScreen t={t} onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: t.platform.auth.toggleToRegister }));
    expect(screen.getByLabelText(t.platform.auth.firstName)).toBeTruthy();
    expect(screen.getByRole("button", { name: t.platform.auth.registerSubmit })).toBeTruthy();
  });

  it(
    "registering with an already-used email (no session granted back) falls back to login " +
      "mode AND shows the conditional message -- never a silent screen change " +
      "(bug fixed 11/10/2026: the switch used to happen with setError(null), leaving the " +
      "person with no explanation)",
    async () => {
      mockFetch((url) => {
        if (url.includes("/api/auth/register")) return { ok: true };
        if (url.includes("/api/auth/me")) return { user: null };
        return {};
      });
      const onAuthenticated = vi.fn();
      const user = userEvent.setup();
      render(<AuthScreen t={t} onAuthenticated={onAuthenticated} />);

      await user.click(screen.getByRole("button", { name: t.platform.auth.toggleToRegister }));
      await user.type(screen.getByLabelText(t.platform.auth.email), "existing@b.com");
      await user.type(screen.getByLabelText(t.platform.auth.password), "un-mot-de-passe-solide");
      await user.click(screen.getByRole("button", { name: t.platform.auth.registerSubmit }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: t.platform.auth.loginSubmit })).toBeTruthy()
      );
      expect(await screen.findByText(t.platform.auth.possibleExistingAccount)).toBeTruthy();
      expect(onAuthenticated).not.toHaveBeenCalled();
    }
  );

  it(
    "registration blocked by the rate limit shows the generic error, not a fake success " +
      "(bug fixed 11/10/2026: this used to return {ok:true} with no account created, which " +
      "the UI read as success before silently bouncing to a login that could never work)",
    async () => {
      mockFetch((url) => {
        if (url.includes("/api/auth/register")) {
          return { ok: false, error: t.platform.errors.genericRetry };
        }
        return {};
      });
      const onAuthenticated = vi.fn();
      const user = userEvent.setup();
      render(<AuthScreen t={t} onAuthenticated={onAuthenticated} />);

      await user.click(screen.getByRole("button", { name: t.platform.auth.toggleToRegister }));
      await user.type(screen.getByLabelText(t.platform.auth.email), "quelqu-un@b.com");
      await user.type(screen.getByLabelText(t.platform.auth.password), "un-mot-de-passe-solide");
      await user.click(screen.getByRole("button", { name: t.platform.auth.registerSubmit }));

      expect(await screen.findByText(t.platform.errors.genericRetry)).toBeTruthy();
      // Still on the register screen -- never silently switched, since this
      // response is a plain {ok:false} the existing error path already handles.
      expect(screen.getByRole("button", { name: t.platform.auth.registerSubmit })).toBeTruthy();
      expect(onAuthenticated).not.toHaveBeenCalled();
    }
  );

  it("forgot-password shows the generic confirmation regardless of the email", async () => {
    mockFetch((url) => {
      if (url.includes("/api/auth/forgot-password")) return { ok: true };
      return {};
    });
    const user = userEvent.setup();
    render(<AuthScreen t={t} onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: t.platform.auth.forgotLink }));
    await user.type(screen.getByLabelText(t.platform.auth.email), "n-importe-qui@b.com");
    await user.click(screen.getByRole("button", { name: t.platform.auth.forgotSubmit }));

    expect(await screen.findByText(t.platform.auth.forgotEmailSent)).toBeTruthy();
  });
});
