// src/pages/DemoWorkspace.tsx  (adds Home/Demo links in sidebar and keeps read-only)
import { useState } from "react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";

type Member = { id: string; name: string; email: string };
type Message = { id: string; author: string; text: string; at: string };
type Task = { id: string; title: string; status: "todo" | "doing" | "done"; due?: string };

function Sidebar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const items = ["Overview", "Chat", "Tasks", "Notes", "Files", "Code"] as const;
  return (
    <aside className="w-64 shrink-0 border-r bg-white hidden md:flex md:flex-col">
      <div className="h-16 px-4 flex items-center border-b justify-between">
        <Link to="/" className="text-sm px-2 py-1 rounded border hover:bg-gray-50">← Home</Link>
        <Link to="/cove/demo" className="text-sm px-2 py-1 rounded border bg-gray-100">Demo</Link>
      </div>
      <nav className="p-3 grid gap-1">
        {items.map((label) => (
          <button key={label} onClick={() => setTab(label)}
            className={`text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${tab === label ? "bg-gray-100" : ""}`}>
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default function DemoWorkspacePage() {
  const readOnly = true;
  const [tab, setTab] = useState("Overview");

  const members: Member[] = [
    { id: "1", name: "Ishan", email: "ishan@example.com" },
    { id: "2", name: "Nishi", email: "nish@example.com" },
  ];
  const overview = { description: "Demo Cove – read-only showcase", deadline: "" };
  const messages: Message[] = [
    { id: "m1", author: "Ishan", text: "Welcome to the demo!", at: "10:05" },
    { id: "m2", author: "Nishi", text: "Everything is read-only here.", at: "10:07" },
  ];
  const tasks: Task[] = [
    { id: "t1", title: "Review UI", status: "todo", due: "2025-09-01" },
    { id: "t2", title: "Connect GitHub", status: "doing" },
    { id: "t3", title: "Ship demo", status: "done" },
  ];
  const notes = "## Demo Notes\n\n- You cannot edit this demo.\n- Explore the Code space for a feel.";
  const code = `export const demo = true;\nconsole.log("Read-only demo");\n`;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[16rem,1fr] bg-gray-50 text-gray-900">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="min-h-0 grid">
        {tab === "Overview" && (
          <div className="p-4 space-y-6">
            <div className="card p-4">
              <h3 className="font-semibold">Project description</h3>
              <p className="mt-2 whitespace-pre-wrap">{overview.description}</p>
            </div>
            <div className="card p-4">
              <h3 className="font-semibold">Members</h3>
              <ul className="mt-2 divide-y">
                {members.map((m) => (
                  <li key={m.id} className="py-2">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-gray-600">{m.email}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "Chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="max-w-[80%]">
                  <div className="text-xs text-gray-500 mb-1">{m.author} • {m.at}</div>
                  <div className="p-3 rounded-xl border bg-white shadow-soft">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t bg-white flex gap-2 opacity-60 cursor-not-allowed">
              <input className="input" placeholder="Messaging disabled in demo" disabled />
              <button className="btn-primary" disabled>Send</button>
            </div>
          </div>
        )}

        {tab === "Tasks" && (
          <div className="p-4 grid md:grid-cols-3 gap-4">
            {(["todo","doing","done"] as const).map((col) => (
              <div key={col} className="bg-white border rounded-xl p-3 min-h-[280px] shadow-soft">
                <h4 className="font-medium mb-3">
                  {col === "todo" ? "To do" : col === "doing" ? "In progress" : "Done"}
                </h4>
                <div className="grid gap-2">
                  {tasks.filter((t) => t.status === col).map((t) => (
                    <div key={t.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-gray-600">{t.due ? `Due: ${t.due}` : "No due date"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Notes" && (
          <div className="h-full grid grid-rows-[auto,1fr]">
            <div className="border-b px-4 py-2 text-sm text-gray-600 bg-white">Markdown preview (read-only)</div>
            <div className="p-4 whitespace-pre-wrap">{notes}</div>
          </div>
        )}

        {tab === "Files" && (
          <div className="h-full p-4">
            <div className="border-2 border-dashed rounded-xl p-6 text-center opacity-60">
              File uploads disabled in demo
            </div>
          </div>
        )}

        {tab === "Code" && (
          <div className="h-full">
            <div className="border-b bg-white px-3 py-2 text-sm text-gray-500">/src/demo.ts (read-only)</div>
            <Editor height="calc(100vh - 64px - 40px)" language="typescript" value={code}
                    options={{ readOnly: true, minimap: { enabled: false }, automaticLayout: true }} theme="vs" />
          </div>
        )}
      </main>
    </div>
  );
}
