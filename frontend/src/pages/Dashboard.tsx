import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureSession, getUser, signOutEverywhere } from "@/lib/auth";
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  type Workspace,
} from "@/lib/workspaces";

export default function Dashboard() {
  const nav = useNavigate();
  const user = getUser();
  const [ws, setWs] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return nav("/signin");
        await ensureSession();
        setWs(await listWorkspaces());
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  if (!user) return null;

  const add = async () => {
    if (!newName.trim()) return;
    try {
      const created = await createWorkspace({ name: newName.trim() });
      setWs([created, ...ws]);
      setNewName("");
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center justify-between px-4">
        <Link to="/" className="font-semibold">CoveStack</Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Signed in as <strong>{user.name}</strong></span>
          <button className="btn-secondary" onClick={async () => { await signOutEverywhere(); nav("/"); }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-semibold">Your Workspaces</h2>

        <div className="mt-4 grid sm:grid-cols-[1fr,auto] gap-2">
          <input className="input" placeholder="New workspace name…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary" onClick={add}>Create</button>
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <ul className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ws.map((w) => (
            <li key={w.id} className="border rounded-xl bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <Link to={`/cove/${w.id}`} className="font-medium hover:underline">{w.name}</Link>
                <span className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    const name = prompt("Rename workspace", w.name);
                    if (name && name.trim()) {
                      const updated = await renameWorkspace(w.id, name.trim());
                      setWs(ws.map(x => x.id === w.id ? updated : x));
                    }
                  }}
                >
                  Rename
                </button>
                <button
                  className="btn border"
                  onClick={async () => {
                    if (confirm(`Delete "${w.name}"?`)) {
                      await deleteWorkspace(w.id);
                      setWs(ws.filter(x => x.id !== w.id));
                    }
                  }}
                >
                  Delete
                </button>
                <Link className="btn-primary ml-auto" to={`/cove/${w.id}`}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
