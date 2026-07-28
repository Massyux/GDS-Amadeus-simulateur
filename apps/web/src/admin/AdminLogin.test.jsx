import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLogin from "./AdminLogin.jsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminLogin", () => {
  it("calls onLoggedIn with the token when the secret is valid", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ valid: true, token: "abc.def" }), { status: 200 })
      )
    );

    render(<AdminLogin onLoggedIn={onLoggedIn} />);
    await user.type(screen.getByLabelText("Phrase secrète"), "correct-secret");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith("abc.def"));
  });

  it("trims surrounding whitespace before sending the secret (copy-paste safety)", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ valid: true, token: "abc.def" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminLogin onLoggedIn={onLoggedIn} />);
    await user.type(screen.getByLabelText("Phrase secrète"), "  correct-secret  ");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled());
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.secret).toBe("correct-secret");
  });

  it("shows an error and never calls onLoggedIn when the secret is wrong", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ valid: false }), { status: 200 }))
    );

    render(<AdminLogin onLoggedIn={onLoggedIn} />);
    await user.type(screen.getByLabelText("Phrase secrète"), "wrong");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Phrase secrète invalide.");
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("disables the submit button while checking and when the field is empty", async () => {
    render(<AdminLogin onLoggedIn={() => {}} />);
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeDisabled();
  });
});
