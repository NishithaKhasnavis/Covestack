import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, listWorkspaces, createWorkspace, renameWorkspace, deleteWorkspace, Workspace, signOut } from "@/lib/auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [ws, setWs] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    setWs(listWorkspaces());
  }, [navigate]);

  if (!user) return null;

  const add = () => {
    if (!newName.trim()) return;
    const created = createWorkspace(newName.trim());
    setWs([created, ...listWorkspaces()]);
    setNewName("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center justify-between px-4">
        <Link to="/" className="font-semibold">CoveStack</Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Signed in as <strong>{user.name}</strong></span>
          <button className="btn-secondary" onClick={() => { signOut(); navigate("/"); }}>Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-semibold">Your Workspaces</h2>

        <div className="mt-4 grid sm:grid-cols-[1fr,auto] gap-2">
          <input className="input" placeholder="New workspace name…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary" onClick={add}>Create</button>
        </div>

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
                  onClick={() => {
                    const name = prompt("Rename workspace", w.name);
                    if (name && name.trim()) {
                      renameWorkspace(w.id, name.trim());
                      setWs(listWorkspaces());
                    }
                  }}
                >
                  Rename
                </button>
                <button
                  className="btn border"
                  onClick={() => {
                    if (confirm(`Delete "${w.name}"?`)) {
                      deleteWorkspace(w.id);
                      setWs(listWorkspaces());
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
