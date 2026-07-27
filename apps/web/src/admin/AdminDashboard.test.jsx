import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "./AdminDashboard.jsx";

const TOKEN = "test-token";

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminDashboard", () => {
  it("lists licenses fetched on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          licenses: [
            {
              id: 1,
              tier: "individual",
              maxDevices: 1,
              devicesUsed: 1,
              clientName: "Client A",
              status: "active",
              createdAt: "2026-07-27 10:00:00",
              lastActivity: "2026-07-27 11:00:00",
            },
          ],
        })
      )
    );

    render(<AdminDashboard token={TOKEN} onLogout={() => {}} />);

    expect(await screen.findByText("Client A")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("logs out when the licenses fetch is unauthorized", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    const onLogout = vi.fn();

    render(<AdminDashboard token={TOKEN} onLogout={onLogout} />);

    await waitFor(() => expect(onLogout).toHaveBeenCalled());
  });

  it("creates a new license and shows the key once", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url, options) => {
      if (options?.method === "POST") {
        return jsonResponse({
          key: "GDS-NEW1-KEY1",
          license: {
            id: 2,
            tier: "individual",
            maxDevices: 1,
            devicesUsed: 0,
            clientName: "New Client",
            status: "active",
            createdAt: "2026-07-27 12:00:00",
            lastActivity: null,
          },
        });
      }
      return jsonResponse({ licenses: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard token={TOKEN} onLogout={() => {}} />);
    await screen.findByText("Chargement…", {}, { timeout: 100 }).catch(() => {});

    await user.click(await screen.findByRole("button", { name: "Nouvelle clé" }));
    await user.type(screen.getByPlaceholderText("Nom du client"), "New Client");
    await user.click(screen.getByRole("button", { name: "Générer" }));

    expect(await screen.findByText("GDS-NEW1-KEY1")).toBeInTheDocument();
  });

  it("revokes and reactivates a license", async () => {
    const user = userEvent.setup();
    let status = "active";
    const fetchMock = vi.fn(async (url, options) => {
      if (options?.method === "PATCH") {
        status = JSON.parse(options.body).status;
        return jsonResponse({ ok: true });
      }
      return jsonResponse({
        licenses: [
          {
            id: 3,
            tier: "individual",
            maxDevices: 1,
            devicesUsed: 0,
            clientName: "Revoke Me",
            status,
            createdAt: "2026-07-27 10:00:00",
            lastActivity: null,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard token={TOKEN} onLogout={() => {}} />);
    await screen.findByText("Revoke Me");

    await user.click(screen.getByRole("button", { name: "Révoquer" }));
    expect(await screen.findByText("révoquée")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Réactiver" })).toBeInTheDocument();
  });

  it("expands a license's devices and frees one", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url, options) => {
      if (options?.method === "DELETE") {
        return jsonResponse({ ok: true });
      }
      if (String(url).includes("/activations")) {
        return jsonResponse({
          activations: [
            {
              id: 10,
              deviceFingerprint: "abcdef0123456789",
              createdAt: "2026-07-27 09:00:00",
              lastSeenAt: "2026-07-27 09:30:00",
            },
          ],
        });
      }
      return jsonResponse({
        licenses: [
          {
            id: 4,
            tier: "school",
            maxDevices: 2,
            devicesUsed: 1,
            clientName: "School",
            status: "active",
            createdAt: "2026-07-27 10:00:00",
            lastActivity: "2026-07-27 10:30:00",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard token={TOKEN} onLogout={() => {}} />);
    await user.click(await screen.findByRole("button", { name: "1/2" }));

    expect(await screen.findByText(/abcdef012345/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Libérer ce poste" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/activations/10",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("exports the current license list as CSV", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          licenses: [
            {
              id: 5,
              tier: "individual",
              maxDevices: 1,
              devicesUsed: 0,
              clientName: "CSV Client",
              status: "active",
              createdAt: "2026-07-27 10:00:00",
              lastActivity: null,
            },
          ],
        })
      )
    );
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    render(<AdminDashboard token={TOKEN} onLogout={() => {}} />);
    await screen.findByText("CSV Client");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
  });
});
