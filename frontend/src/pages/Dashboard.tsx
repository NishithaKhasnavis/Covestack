import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, signOut, ensureSession } from "@/lib/auth";
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  Workspace,
} from "@/lib/workspaces";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [ws, setWs] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      // if there’s no cached user, try cookie session via /me
      let u = getUser();
      if (!u) {
        u = await ensureSession();
        setUser(u);
      }
      if (!u) {
        navigate("/signin");
        return;
      }
      const data = await listWorkspaces();
      setWs(data);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }
  if (!user) return null;

  const add = async () => {
    if (!newName.trim()) return;
    try {
      const created = await createWorkspace({ name: newName.trim() });
      setWs((prev) => [created, ...prev]);
      setNewName("");
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const doSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center justify-between px-4">
        <Link to="/" className="font-semibold">
          CoveStack
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Signed in as <strong>{user?.name || user?.email}</strong>
          </span>
          <button className="btn-secondary" onClick={doSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-semibold">Your Workspaces</h2>

        <div className="mt-4 grid sm:grid-cols-[1fr,auto] gap-2">
          <input
            className="input"
            placeholder="New workspace name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-primary" onClick={add} disabled={!newName.trim()}>
            Create
          </button>
        </div>

        {err ? (
          <p className="mt-3 text-sm text-red-600">Error: {err}</p>
        ) : null}

        {loading ? (
          <p className="mt-6">Loading workspaces…</p>
        ) : (
          <ul className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ws.map((w) => (
              <li key={w.id} className="border rounded-xl bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <Link to={`/cove/${w.id}`} className="font-medium hover:underline">
                    {w.name}
                  </Link>
                  <span className="text-xs text-gray-500">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      const name = prompt("Rename workspace", w.name);
                      if (name && name.trim()) {
                        try {
                          const updated = await renameWorkspace(w.id, name.trim());
                          setWs((prev) =>
                            prev.map((x) => (x.id === w.id ? { ...x, name: updated.name } : x))
                          );
                        } catch (e: any) {
                          setErr(e?.message || String(e));
                        }
                      }
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn border"
                    onClick={async () => {
                      if (confirm(`Delete "${w.name}"?`)) {
                        try {
                          await deleteWorkspace(w.id);
                          setWs((prev) => prev.filter((x) => x.id !== w.id));
                        } catch (e: any) {
                          setErr(e?.message || String(e));
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                  <Link className="btn-primary ml-auto" to={`/cove/${w.id}`}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
