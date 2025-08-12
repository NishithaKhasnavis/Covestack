// src/pages/CoveWorkspace.tsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Modal from "../components/ui/modal";

/* ========= Buttons ========= */
const Button = ({ className = "", type = "button", ...p }: any) => (
  <button {...p} type={type} className={`btn ${className}`} />
);
const BtnPrimary = (p: any) => (
  <Button {...p} className={`btn-primary ${p.className ?? ""}`} />
);
const BtnSecondary = (p: any) => (
  <Button {...p} className={`btn-secondary ${p.className ?? ""}`} />
);

/* ========= Types ========= */
type Message = { id: string; author: string; text: string; at: string };
type Task = { id: string; title: string; status: "todo" | "doing" | "done"; due?: string };
type Member = { id: string; name: string; email: string };

type FileLanguage =
  | "typescript" | "javascript" | "json" | "markdown" | "html" | "css"
  | "python" | "java" | "c" | "cpp" | "csharp" | "go" | "rust" | "yaml" | "xml" | "shell";

type FileNode = { id: string; kind: "file"; name: string; path: string; language: FileLanguage; value: string };
type FolderNode = { id: string; kind: "folder"; name: string; path: string; children: TreeNode[]; isOpen?: boolean };
type TreeNode = FileNode | FolderNode;

/* ========= Utils ========= */
const EXT_TO_LANG: Record<string, FileLanguage> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", json: "json",
  md: "markdown", html: "html", css: "css", py: "python", java: "java",
  c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", cs: "csharp", go: "go", rs: "rust",
  yml: "yaml", yaml: "yaml", xml: "xml", sh: "shell", bash: "shell",
};
const detectLanguageByName = (name: string): FileLanguage =>
  EXT_TO_LANG[(name.split(".").pop() ?? "").toLowerCase()] ?? "typescript";

const makeFolder = (path: string): FolderNode => ({
  id: crypto.randomUUID(),
  kind: "folder",
  name: path.split("/").pop() ?? "",
  path,
  children: [],
  isOpen: true,
});

const makeFile = (path: string, value = ""): FileNode => {
  const name = path.split("/").pop() || "file";
  return { id: crypto.randomUUID(), kind: "file", name, path, language: detectLanguageByName(name), value };
};

function ensureFolder(root: FolderNode, folderPath: string): FolderNode {
  const parts = folderPath.split("/").filter(Boolean);
  let cur = root;
  for (const part of parts) {
    let next = cur.children.find((c) => c.kind === "folder" && c.name === part) as FolderNode | undefined;
    if (!next) {
      const nextPath = [cur.path, part].filter(Boolean).join("/");
      next = makeFolder(nextPath);
      cur.children.push(next);
    }
    cur = next;
  }
  return cur;
}
function insertFileAt(root: FolderNode, folderPath: string, fileName: string, value = ""): string {
  const folder = ensureFolder(root, folderPath);
  const newPath = [folder.path, fileName].filter(Boolean).join("/");
  folder.children.push(makeFile(newPath, value));
  return newPath;
}
function findNodeByPath(root: FolderNode, path: string): TreeNode | undefined {
  if (!path) return root;
  const names = path.split("/").filter(Boolean);
  let node: TreeNode = root;
  for (const n of names) {
    if (node.kind !== "folder") return undefined;
    const childNode: TreeNode | undefined = node.children.find((c) => c.name === n);
    if (!childNode) return undefined;
    node = childNode;
  }
  return node;
}
function mapTree(n: TreeNode, fn: (n: TreeNode) => TreeNode): TreeNode {
  if (n.kind === "folder") return fn({ ...n, children: n.children.map((c) => mapTree(c, fn)) });
  return fn({ ...n });
}

/** remove by ID (safe; no accidental mass delete) */
function removeNodeById(root: FolderNode, targetId: string): FolderNode {
  const clone = structuredClone(root) as FolderNode;
  function rec(node: FolderNode): boolean {
    const before = node.children.length;
    node.children = node.children.filter((c) => c.id !== targetId);
    if (node.children.length !== before) return true;
    let removed = false;
    node.children.forEach((c) => {
      if (c.kind === "folder") {
        removed = rec(c) || removed;
      }
    });
    return removed;
  }
  rec(clone);
  return clone;
}

/* ========= Workspace data ========= */
function useWorkspaceData() {
  const [messages, setMessages] = useState<Message[]>([]); // empty initial chat
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([{ id: "u1", name: "You", email: "you@example.com" }]);
  const [overview, setOverview] = useState<{ description: string; deadline?: string }>({ description: "" });
  return { messages, setMessages, tasks, setTasks, members, setMembers, overview, setOverview };
}

/* ========= Sidebar (Home / Demo quick nav) ========= */
function Sidebar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const items = ["Overview", "Chat", "Tasks", "Notes", "Files", "Code"] as const;
  return (
    <aside className="w-64 shrink-0 border-r bg-white hidden md:flex md:flex-col">
      <div className="h-16 px-4 flex items-center border-b justify-between">
        <Link to="/" className="text-sm px-2 py-1 rounded border hover:bg-gray-50">← Home</Link>
        <Link to="/cove/demo" className="text-sm px-2 py-1 rounded border hover:bg-gray-50">Demo</Link>
      </div>
      <nav className="p-3 grid gap-1">
        {items.map((label) => (
          <button
            key={label}
            onClick={() => setTab(label)}
            className={`text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${tab === label ? "bg-gray-100" : ""}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ========= Overview (edit/save with draft) ========= */
function OverviewPanel({
  readOnly, members, setMembers, overview, setOverview,
}: {
  readOnly?: boolean;
  members: Member[];
  setMembers: (m: Member[]) => void;
  overview: { description: string; deadline?: string };
  setOverview: (o: { description: string; deadline?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [descDraft, setDescDraft] = useState(overview.description);
  const [deadlineDraft, setDeadlineDraft] = useState(overview.deadline ?? "");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const startEdit = () => { setDescDraft(overview.description); setDeadlineDraft(overview.deadline ?? ""); setEditing(true); };
  const save = () => { setOverview({ description: descDraft, deadline: deadlineDraft || undefined }); setEditing(false); };

  return (
    <div className="p-4 space-y-6">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Project overview</h3>
          {!editing ? (
            <BtnSecondary onClick={startEdit} disabled={readOnly}>Edit</BtnSecondary>
          ) : (
            <div className="flex gap-2">
              <BtnSecondary onClick={() => setEditing(false)}>Cancel</BtnSecondary>
              <BtnPrimary onClick={save}>Save</BtnPrimary>
            </div>
          )}
        </div>

        {!editing ? (
          <>
            <p className="mt-2 whitespace-pre-wrap">{overview.description || "No description yet."}</p>
            <div className="mt-2 text-sm text-gray-600">{overview.deadline ? `Deadline: ${overview.deadline}` : "No deadline."}</div>
          </>
        ) : (
          <>
            <textarea
              className="w-full mt-3 p-3 border rounded-lg outline-none"
              placeholder="What is this cove about?"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-gray-600">Optional deadline</label>
              <input type="date" className="input max-w-xs" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Members</h3>
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="py-2">
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-gray-600">{m.email}</div>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid sm:grid-cols-[1fr,1fr,auto] gap-2">
          <input className="input" placeholder="Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} disabled={readOnly}/>
          <input className="input" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={readOnly}/>
          <BtnSecondary
            onClick={() => {
              if (!inviteEmail.trim()) return;
              setMembers([...members, { id: crypto.randomUUID(), name: inviteName || inviteEmail, email: inviteEmail }]);
              setInviteName(""); setInviteEmail("");
            }}
            disabled={readOnly}
          >
            Invite
          </BtnSecondary>
        </div>
      </div>
    </div>
  );
}

/* ========= Chat ========= */
function ChatPanel({ messages, onSend, readOnly }: { messages: Message[]; onSend: (t: string) => void; readOnly?: boolean }) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
        {messages.map((m) => (
          <div key={m.id} className="max-w-[80%]">
            <div className="text-xs text-gray-500 mb-1">{m.author} • {m.at}</div>
            <div className="p-3 rounded-xl border bg-white shadow-soft">{m.text}</div>
          </div>
        ))}
      </div>
      <form
        className="p-3 border-t bg-white flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (readOnly) return; if (!text.trim()) return; onSend(text.trim()); setText(""); }}
      >
        <input className="input" placeholder={readOnly ? "Messaging disabled in demo" : "Message #general"} disabled={readOnly} value={text} onChange={(e) => setText(e.target.value)} />
        <BtnPrimary type="submit" disabled={readOnly}>Send</BtnPrimary>
      </form>
    </div>
  );
}

/* ========= Tasks (NO hooks inside map; TaskCard child instead) ========= */
function TaskCard({
  task, onChange, onDelete, onMove, readOnly,
}: {
  task: Task;
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onMove: (dir: "left" | "right") => void;
  readOnly?: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [dueDraft, setDueDraft] = useState(task.due ?? "");

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      {!edit ? (
        <>
          <div className="text-sm font-medium">{task.title}</div>
          <div className="text-xs text-gray-600">{task.due ? `Due: ${task.due}` : "No due date"}</div>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <select
              className="border rounded px-2 py-1 text-xs"
              value={task.status}
              disabled={readOnly}
              onChange={(e) => onChange({ status: e.target.value as Task["status"] })}
            >
              <option value="todo">To do</option>
              <option value="doing">In progress</option>
              <option value="done">Done</option>
            </select>
            <button className="px-2 py-1 rounded border" disabled={readOnly} onClick={() => onMove("left")}>←</button>
            <button className="px-2 py-1 rounded border" disabled={readOnly} onClick={() => onMove("right")}>→</button>
            <button className="px-2 py-1 rounded border" disabled={readOnly} onClick={() => setEdit(true)}>Edit</button>
            <button className="px-2 py-1 rounded border" disabled={readOnly} onClick={onDelete}>Delete</button>
          </div>
        </>
      ) : (
        <>
          <input className="input mb-2" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
          <input type="date" className="input max-w-[12rem] mb-2" value={dueDraft} onChange={(e) => setDueDraft(e.target.value)} />
          <div className="flex gap-2">
            <BtnPrimary onClick={() => { onChange({ title: titleDraft, due: dueDraft || undefined }); setEdit(false); }}>Save</BtnPrimary>
            <BtnSecondary onClick={() => { setTitleDraft(task.title); setDueDraft(task.due ?? ""); setEdit(false); }}>Cancel</BtnSecondary>
          </div>
        </>
      )}
    </div>
  );
}

function TasksPanel({ tasks, setTasks, readOnly }: { tasks: Task[]; setTasks: (t: Task[]) => void; readOnly?: boolean }) {
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");

  const addTask = () => {
    if (!newTitle.trim()) return;
    setTasks([{ id: crypto.randomUUID(), title: newTitle.trim(), due: newDue || undefined, status: "todo" }, ...tasks]);
    setNewTitle(""); setNewDue("");
  };

  const updateTask = (id: string, patch: Partial<Task>) => setTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const delTask = (id: string) => setTasks(tasks.filter((t) => t.id !== id));
  const move = (id: string, dir: "left" | "right") => {
    const order: Task["status"][] = ["todo", "doing", "done"];
    setTasks(tasks.map((t) => {
      if (t.id !== id) return t;
      const idx = order.indexOf(t.status) + (dir === "right" ? 1 : -1);
      return { ...t, status: order[Math.max(0, Math.min(order.length - 1, idx))] };
    }));
  };

  const groups = useMemo(() => ({
    todo: tasks.filter((t) => t.status === "todo"),
    doing: tasks.filter((t) => t.status === "doing"),
    done: tasks.filter((t) => t.status === "done"),
  }), [tasks]);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="card p-3 grid sm:grid-cols-[1fr,auto,auto] gap-2">
        <input className="input" placeholder="Add a task…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={readOnly}/>
        <input type="date" className="input max-w-[12rem]" value={newDue} onChange={(e) => setNewDue(e.target.value)} disabled={readOnly}/>
        <BtnPrimary onClick={addTask} disabled={readOnly}>Add</BtnPrimary>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(["todo","doing","done"] as const).map((col) => (
          <div key={col} className="bg-white border rounded-xl p-3 min-h-[280px] shadow-soft">
            <h4 className="font-medium mb-3">{col === "todo" ? "To do" : col === "doing" ? "In progress" : "Done"}</h4>
            <div className="grid gap-2">
              {groups[col].map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  readOnly={readOnly}
                  onChange={(patch) => updateTask(t.id, patch)}
                  onDelete={() => delTask(t.id)}
                  onMove={(dir) => move(t.id, dir)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========= Notes (with Undo) ========= */
function NotesPanel({ readOnly }: { readOnly?: boolean }) {
  const [history, setHistory] = useState<string[]>(["## Team Notes\n\n- Describe your plan here."]);
  const [idx, setIdx] = useState(0);
  const value = history[idx];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    const next = history.slice(0, idx + 1);
    next.push(draft);
    setHistory(next);
    setIdx(next.length - 1);
    setEditing(false);
  };
  const undo = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="border-b px-4 py-2 flex items-center gap-2 bg-white">
        <span className="text-sm text-gray-600">{editing ? "Editing" : "Preview"}</span>
        <div className="ml-auto flex gap-2">
          <BtnSecondary onClick={undo} disabled={idx === 0}>Undo</BtnSecondary>
          {!editing ? (
            <BtnSecondary onClick={() => { setDraft(value); setEditing(true); }} disabled={readOnly}>Edit</BtnSecondary>
          ) : (
            <>
              <BtnSecondary onClick={() => setEditing(false)}>Cancel</BtnSecondary>
              <BtnPrimary onClick={save}>Save</BtnPrimary>
            </>
          )}
        </div>
      </div>
      {!editing ? (
        <div className="p-4 whitespace-pre-wrap leading-relaxed">{value}</div>
      ) : (
        <textarea className="w-full h-full p-4 outline-none" value={draft} onChange={(e) => setDraft(e.target.value)} />
      )}
    </div>
  );
}

/* ========= Files (unchanged editor modal; already supports open/edit/save/delete) ========= */
type Uploaded = { id: string; name: string; size: number; type: string; content: string };
function FilesPanel({ readOnly }: { readOnly?: boolean }) {
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [active, setActive] = useState<Uploaded | null>(null);
  const [draftName, setDraftName] = useState(""); const [draftContent, setDraftContent] = useState("");

  const onUpload = (fl: FileList | null) => {
    if (!fl || readOnly) return;
    Array.from(fl).forEach((f) => {
      const r = new FileReader();
      r.onload = () => {
        setFiles((prev) => [...prev, { id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type, content: typeof r.result === "string" ? r.result : "" }]);
      };
      r.readAsText(f);
    });
  };

  const openFile = (f: Uploaded) => { setActive(f); setDraftName(f.name); setDraftContent(f.content); };
  const saveFile = () => {
    if (!active) return;
    setFiles((prev) => prev.map((x) => (x.id === active.id ? { ...x, name: draftName, content: draftContent } : x)));
    setActive(null);
  };
  const deleteFile = (id: string) => setFiles((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="h-full p-4">
      <label className={`block border-2 border-dashed rounded-xl p-6 text-center ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
        <input type="file" multiple className="hidden" disabled={readOnly} onChange={(e) => onUpload(e.target.files)} />
        Drag & drop or click to upload {readOnly && "(disabled in demo)"}
      </label>
      <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((f) => (
          <li key={f.id} className="border rounded-xl p-3 bg-white">
            <div className="font-medium text-sm truncate">{f.name}</div>
            <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</div>
            <div className="mt-2 flex gap-2">
              <BtnSecondary className="h-8" onClick={() => openFile(f)} disabled={readOnly}>Open</BtnSecondary>
              <Button className="h-8 border" onClick={() => deleteFile(f.id)} disabled={readOnly}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={!!active}
        onClose={() => setActive(null)}
        title="Edit file"
        footer={
          <div className="flex justify-end gap-2">
            <BtnSecondary onClick={() => setActive(null)}>Cancel</BtnSecondary>
            <BtnPrimary onClick={saveFile} disabled={readOnly}>Save</BtnPrimary>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-[1fr,auto] gap-2 items-center">
            <input className="input" value={draftName} onChange={(e) => setDraftName(e.target.value)} disabled={readOnly}/>
            <span className="text-xs text-gray-500">{active?.type || "text"}</span>
          </div>
          <textarea className="w-full h-64 p-3 border rounded-lg outline-none" value={draftContent} onChange={(e) => setDraftContent(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

/* ========= Tree view ========= */
function TreeView({ node, selectedPath, onSelect, onToggle }: {
  node: TreeNode; selectedPath: string | null; onSelect: (n: TreeNode) => void; onToggle: (folderId: string) => void;
}) {
  if (node.kind === "file") {
    const isActive = selectedPath === node.path;
    return (
      <button className={`w-full text-left px-3 py-1.5 rounded-md hover:bg-gray-50 ${isActive ? "bg-gray-100 font-medium" : ""}`} onClick={() => onSelect(node)} title={node.path}>
        <span className="truncate">{node.name}</span>
      </button>
    );
  }
  const isOpen = node.isOpen !== false;
  return (
    <div>
      <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-gray-50 font-medium" onClick={() => onToggle(node.id)} title={node.path || "/"}>
        <span className="mr-1">{isOpen ? "▾" : "▸"}</span><span className="truncate">{node.name || "/"}</span>
      </button>
      {isOpen && (
        <div className="pl-4">
          {node.children
            .slice()
            .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1))
            .map((child) => (
              <TreeView key={child.id} node={child} selectedPath={selectedPath} onSelect={onSelect} onToggle={onToggle} />
            ))}
        </div>
      )}
    </div>
  );
}

/* ========= Code (delete by ID; rest as before) ========= */
function CodePanel({ readOnly }: { readOnly: boolean }) {
  const [root, setRoot] = useState<FolderNode>(() => {
    const r = makeFolder("");
    insertFileAt(r, "", "README.md", `# Code space
- Create folders/files anywhere
- Upload files/folders
- Edit with Monaco
`);
    insertFileAt(r, "src", "index.ts", `export const hello = (name: string) => "Hello " + name;`);
    return r;
  });

  const [selectedPath, setSelectedPath] = useState<string>("src/index.ts");
  const selectedNode = useMemo(() => findNodeByPath(root, selectedPath) as TreeNode | undefined, [root, selectedPath]);

  const selectedFolderPath = useMemo(() => {
    if (!selectedNode) return "";
    if (selectedNode.kind === "folder") return selectedNode.path;
    const parts = selectedNode.path.split("/"); parts.pop(); return parts.join("/");
  }, [selectedNode]);

  const setRootMapped = (fn: (n: TreeNode) => TreeNode) => setRoot((prev) => mapTree(prev, fn) as FolderNode);
  const onSelect = (n: TreeNode) => setSelectedPath(n.path);
  const onToggle = (id: string) => setRootMapped((n) => (n.kind === "folder" && n.id === id ? { ...n, isOpen: !n.isOpen } : n));

  const createFolderAt = (base: string) => {
    if (readOnly) return;
    const name = prompt(`New folder name (under "${base || "/"}")?`); if (!name) return;
    const next = structuredClone(root) as FolderNode;
    ensureFolder(next, [base, name].filter(Boolean).join("/"));
    setRoot(next); setSelectedPath([base, name].filter(Boolean).join("/"));
  };
  const createFileAt = (base: string) => {
    if (readOnly) return;
    const name = prompt(`New file name (under "${base || "/"}")? e.g. main.py`); if (!name) return;
    const next = structuredClone(root) as FolderNode;
    const newPath = insertFileAt(next, base, name, "");
    setRoot(next); setSelectedPath(newPath);
  };
  const handleUpload = (fl: FileList | null, base: string) => {
    if (!fl || readOnly) return;
    const next = structuredClone(root) as FolderNode;
    Array.from(fl).forEach((file) => {
      const rel = (file as any).webkitRelativePath as string | undefined;
      const path = rel && rel.length > 0 ? rel : file.name;
      const finalPath = [base, path].filter(Boolean).join("/");
      const reader = new FileReader();
      reader.onload = () => {
        const folderPath = finalPath.split("/").slice(0, -1).join("/");
        const fileName = finalPath.split("/").pop()!;
        insertFileAt(next, folderPath, fileName, typeof reader.result === "string" ? reader.result : "");
        setRoot(structuredClone(next)); setSelectedPath(finalPath);
      };
      reader.readAsText(file);
    });
  };

  const mutateFile = (path: string, patch: Partial<FileNode>) => setRootMapped((n) => (n.kind === "file" && n.path === path ? { ...n, ...patch } : n));

  const renameSelected = () => {
    if (!selectedNode || readOnly) return;
    const newName = prompt("New name:", selectedNode.name); if (!newName) return;
    const parent = selectedFolderPath;
    if (selectedNode.kind === "file") {
      const newPath = [parent, newName].filter(Boolean).join("/");
      setRootMapped((n) => (n.kind === "file" && n.id === selectedNode.id ? { ...n, name: newName, path: newPath, language: detectLanguageByName(newName) } : n));
      setSelectedPath(newPath);
    } else {
      const oldPrefix = selectedNode.path;
      const newFolderPath = [parent.split("/").slice(0, -1).join("/"), newName].filter(Boolean).join("/");
      setRootMapped((n) => {
        if (n.kind === "folder" && n.id === selectedNode.id) {
          const transform = (cc: TreeNode): TreeNode => {
            if (cc.kind === "folder") return { ...cc, path: cc.path.replace(oldPrefix, newFolderPath), children: cc.children.map(transform) };
            return { ...cc, path: cc.path.replace(oldPrefix, newFolderPath) };
          };
          return { ...n, name: newName, path: newFolderPath, children: n.children.map(transform) };
        }
        return n;
      });
      setSelectedPath(newFolderPath);
    }
  };
  const deleteSelected = () => {
    if (!selectedNode || readOnly) return;
    if (!confirm(`Delete ${selectedNode.kind} "${selectedNode.name}"? This cannot be undone.`)) return;
    const next = removeNodeById(root, selectedNode.id);
    setRoot(next); setSelectedPath("");
  };

  const save = () => {
    if (readOnly || !selectedNode || selectedNode.kind !== "file") return;
    console.log("SAVE", selectedNode.path, (selectedNode as FileNode).value);
    alert("Saved locally (stub). Wire to your API for persistence.");
  };
  const languageOptions: FileLanguage[] = ["typescript","javascript","python","java","c","cpp","csharp","go","rust","json","markdown","html","css","yaml","xml","shell"];

  return (
    <div className="h-full grid grid-cols-[18rem,1fr]">
      <aside className="border-r bg-white flex flex-col min-h-0">
        <div className="border-b px-3 py-2 grid gap-2">
          <div className="text-xs text-gray-500">Target folder</div>
          <div className="flex items-center gap-2">
            <select className="border rounded-md px-2 py-1 text-sm flex-1" value={selectedFolderPath} onChange={(e) => setSelectedPath(e.target.value)}>
              {(() => {
                const folders: FolderNode[] = [];
                const walk = (n: TreeNode) => { if (n.kind === "folder") { folders.push(n); n.children.forEach(walk); } };
                walk(root);
                return folders.sort((a,b) => (a.path || "/").localeCompare(b.path || "/"))
                  .map((f) => <option key={f.id} value={f.path}>{f.path || "/"}</option>);
              })()}
            </select>
            <BtnSecondary className="h-8" onClick={() => createFolderAt(selectedFolderPath)} disabled={readOnly}>New folder</BtnSecondary>
            <BtnSecondary className="h-8" onClick={() => createFileAt(selectedFolderPath)} disabled={readOnly}>New file</BtnSecondary>
          </div>

          <div className="flex items-center gap-2">
            <label className={`btn-secondary h-8 px-3 ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}>
              Upload files
              <input type="file" multiple className="hidden" disabled={readOnly} onChange={(e) => handleUpload(e.target.files, selectedFolderPath)} />
            </label>
            <label className={`btn-secondary h-8 px-3 ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`} title="Upload folder">
              Upload folder
              <input type="file" multiple className="hidden" disabled={readOnly}
                // @ts-expect-error: Chromium
                webkitdirectory="" directory=""
                onChange={(e) => handleUpload(e.target.files, selectedFolderPath)} />
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <TreeView node={root} selectedPath={selectedPath} onSelect={onSelect} onToggle={onToggle} />
        </div>
      </aside>

      <section className="grid grid-rows-[auto,auto,1fr] min-h-0">
        <div className="border-b bg-white px-3 py-2 flex items-center gap-2">
          <span className="text-sm text-gray-500 truncate">{selectedNode ? selectedNode.path : "Select a file/folder"}</span>
          <div className="ml-auto flex items-center gap-2">
            {selectedNode?.kind === "file" && (
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={selectedNode.language}
                onChange={(e) => setRootMapped((n) => (n.kind === "file" && n.id === selectedNode.id ? { ...n, language: e.target.value as FileLanguage } : n))}
                disabled={readOnly}
                title="Language"
              >
                {languageOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
            <BtnSecondary className="h-8" onClick={renameSelected} disabled={!selectedNode || readOnly}>Rename</BtnSecondary>
            <Button className="h-8 border" onClick={deleteSelected} disabled={!selectedNode || readOnly}>Delete</Button>
            <BtnPrimary className="h-8" onClick={save} disabled={readOnly || !selectedNode || selectedNode.kind !== "file"}>Save</BtnPrimary>
          </div>
        </div>

        {selectedNode?.kind === "file" && (
          <div className="border-b bg-white px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Filename:</span>
            <input
              className="flex-1 px-2 py-1 border rounded-md text-sm"
              value={selectedNode.name}
              onChange={(e) => {
                const newName = e.target.value;
                const parent = selectedFolderPath;
                const newPath = [parent, newName].filter(Boolean).join("/");
                setRootMapped((n) => (n.kind === "file" && n.id === selectedNode.id
                  ? { ...n, name: newName, path: newPath, language: detectLanguageByName(newName) }
                  : n));
                setSelectedPath(newPath);
              }}
              readOnly={readOnly}
            />
          </div>
        )}

        <div className="min-h-0">
          {selectedNode?.kind === "file" ? (
            <Editor
              height="100%"
              language={selectedNode.language}
              value={(selectedNode as FileNode).value}
              onChange={(v) => setRootMapped((n) => (n.kind === "file" && n.id === selectedNode.id ? { ...n, value: v ?? "" } : n))}
              options={{ readOnly, fontSize: 14, minimap: { enabled: false }, automaticLayout: true, padding: { top: 12 } }}
              theme="vs"
            />
          ) : (
            <div className="grid place-items-center h-full text-gray-500">
              {selectedNode?.kind === "folder" ? "Select a file in this folder or create one" : "Select a file or folder"}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ========= Page ========= */
export default function CoveWorkspacePage() {
  const { id } = useParams();
  const readOnly = false;
  const { messages, setMessages, tasks, setTasks, members, setMembers, overview, setOverview } = useWorkspaceData();
  const [tab, setTab] = useState<string>("Overview");

  const onSend = (text: string) =>
    setMessages((m) => [...m, { id: crypto.randomUUID(), author: "You", text, at: new Date().toTimeString().slice(0,5) }]);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[16rem,1fr] bg-gray-50 text-gray-900">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="min-h-0 grid">
        {tab === "Overview" && (
          <OverviewPanel readOnly={readOnly} members={members} setMembers={setMembers} overview={overview} setOverview={setOverview} />
        )}
        {tab === "Chat" && <ChatPanel messages={messages} onSend={onSend} readOnly={readOnly} />}
        {tab === "Tasks" && <TasksPanel tasks={tasks} setTasks={setTasks} readOnly={readOnly} />}
        {tab === "Notes" && <NotesPanel readOnly={readOnly} />}
        {tab === "Files" && <FilesPanel readOnly={readOnly} />}
        {tab === "Code" && <CodePanel readOnly={readOnly} />}
      </main>
    </div>
  );
}
