import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ensureSession, getUser, signOut } from "@/lib/auth";
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  Workspace,
} from "@/lib/workspaces";

export default function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(getUser());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);
      const u = await ensureSession();
      if (!u) {
        navigate("/signin", { replace: true });
        return;
      }
      setMe(u);
      try {
        const ws = await listWorkspaces();
        setItems(ws);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function doCreate() {
    if (!newName.trim()) return;
    try {
      const created = await createWorkspace({ name: newName.trim() });
      setItems([created, ...items]);
      setNewName("");
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function doRename(w: Workspace) {
    const name = prompt("Rename workspace", w.name);
    if (!name || !name.trim()) return;
    try {
      const updated = await renameWorkspace(w.id, name.trim());
      setItems(items.map((x) => (x.id === w.id ? updated : x)));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function doDelete(w: Workspace) {
    if (!confirm(`Delete "${w.name}"?`)) return;
    try {
      await deleteWorkspace(w.id);
      setItems(items.filter((x) => x.id !== w.id));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function doSignOut() {
    await signOut();
    navigate("/signin", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div>Loading…</div>
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center justify-between px-4">
        <Link to="/" className="font-semibold">CoveStack</Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Signed in as <strong>{me.name}</strong>
          </span>
          <button className="btn-secondary" onClick={doSignOut}>Sign out</button>
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
          <button className="btn-primary" onClick={doCreate}>Create</button>
        </div>

        {err && <p className="mt-3 text-sm text-red-600">Error: {err}</p>}

        <ul className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((w) => (
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
                <button className="btn-secondary" onClick={() => doRename(w)}>Rename</button>
                <button className="btn border" onClick={() => doDelete(w)}>Delete</button>
                <Link className="btn-primary ml-auto" to={`/cove/${w.id}`}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
