// src/pages/CoveWorkspace.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Modal from "../components/ui/modal";

import { ensureSession } from "@/lib/auth";
import {
  listTasks as apiListTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  Task, // { id, title, status: 'todo'|'in_progress'|'done', due? }
} from "@/lib/tasks";
import { getNotes, saveNotes, NotesDoc, SaveNotesResult } from "@/lib/notes";
import {
  listFiles as apiListFiles,
  initUpload as apiInitUpload,
  deleteFile as apiDeleteFile,
  getDownloadUrl,
  ServerFile,
  InitUploadResponse,
} from "@/lib/files";


/* ========= Buttons ========= */
const Button = ({ className = "", type = "button", ...p }: any) => (
  <button {...p} type={type} className={`btn ${className}`} />
);
const BtnPrimary = (p: any) => <Button {...p} className={`btn-primary ${p.className ?? ""}`} />;
const BtnSecondary = (p: any) => <Button {...p} className={`btn-secondary ${p.className ?? ""}`} />;

/* ========= Types ========= */
type Message = { id: string; author: string; text: string; at: string };
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
      if (c.kind === "folder") removed = rec(c) || removed;
    });
    return removed;
  }
  rec(clone);
  return clone;
}

/* ========= Workspace data ========= */
function useWorkspaceData() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([{ id: "u1", name: "You", email: "you@example.com" }]);
  const [overview, setOverview] = useState<{ description: string; deadline?: string }>({ description: "" });
  return { messages, setMessages, tasks, setTasks, members, setMembers, overview, setOverview };
}

/* ========= Sidebar ========= */
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

/* ========= Overview ========= */
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

/* ========= Tasks (wired to REST API) ========= */
function TaskCard({ task, onChange, onDelete, onMove, readOnly }: {
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
              <option value="in_progress">In progress</option>
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

function TasksPanel({ workspaceId, tasks, setTasks, readOnly }: {
  workspaceId: string;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  readOnly?: boolean;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        await ensureSession();
        const data = await apiListTasks(workspaceId);
        setTasks(data);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, setTasks]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const created = await apiCreateTask(workspaceId, {
        title: newTitle.trim(),
        status: "todo",
        due: newDue || undefined,
      });
      setTasks([created, ...tasks]);
      setNewTitle("");
      setNewDue("");
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    try {
      const updated = await apiUpdateTask(id, patch);
      setTasks(tasks.map((t) => (t.id === id ? updated : t)));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const delTask = async (id: string) => {
    try {
      await apiDeleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const move = (id: string, dir: "left" | "right") => {
    const order: Task["status"][] = ["todo", "in_progress", "done"];
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(t.status) + (dir === "right" ? 1 : -1)));
    updateTask(id, { status: order[idx] });
  };

  const groups = useMemo(() => ({
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  }), [tasks]);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="card p-3 grid sm:grid-cols-[1fr,auto,auto] gap-2">
        <input className="input" placeholder="Add a task…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={readOnly}/>
        <input type="date" className="input max-w-[12rem]" value={newDue} onChange={(e) => setNewDue(e.target.value)} disabled={readOnly}/>
        <BtnPrimary onClick={addTask} disabled={readOnly}>Add</BtnPrimary>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p className="text-sm">Loading tasks…</p> : null}

      <div className="grid md:grid-cols-3 gap-4">
        {([
          { key: "todo", label: "To do" },
          { key: "in_progress", label: "In progress" },
          { key: "done", label: "Done" },
        ] as const).map((col) => (
          <div key={col.key} className="bg-white border rounded-xl p-3 min-h-[280px] shadow-soft">
            <h4 className="font-medium mb-3">{col.label}</h4>
            <div className="grid gap-2">
              {groups[col.key as keyof typeof groups].map((t) => (
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

/* ========= Notes (server-backed with ETag & conflict) ========= */
function NotesPanel({ workspaceId, readOnly }: { workspaceId: string; readOnly?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [etag, setEtag] = useState<string>("");
  const [doc, setDoc] = useState<NotesDoc | null>(null);
  const [draft, setDraft] = useState<string>("");

  const [conflict, setConflict] = useState<null | {
    etag: string; server: NotesDoc; expected: number; currentVersion: number;
  }>(null);

  const dirty = !!doc && draft !== doc.content;

  async function load() {
    setErr(null); setLoading(true);
    try {
      const { etag, doc } = await getNotes(workspaceId);
      setEtag(etag); setDoc(doc); setDraft(doc.content);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspaceId]);

  async function onSave() {
    if (!doc) return;
    setErr(null);
    const res: SaveNotesResult = await saveNotes(workspaceId, draft, etag);
    if (res.ok) {
      setDoc(res.doc); setDraft(res.doc.content); setEtag(res.etag); setConflict(null);
    } else if (res.type === "conflict") {
      setConflict({ etag: res.etag, server: res.server, expected: res.expected, currentVersion: res.currentVersion });
    }
  }

  function useServer() {
    if (!conflict) return;
    setDoc(conflict.server); setDraft(conflict.server.content); setEtag(conflict.etag); setConflict(null);
  }
  async function overwriteAnyway() {
    if (!conflict) return;
    const res = await saveNotes(workspaceId, draft, conflict.etag);
    if (res.ok) {
      setDoc(res.doc); setDraft(res.doc.content); setEtag(res.etag); setConflict(null);
    } else if (res.type === "conflict") {
      setConflict({ etag: res.etag, server: res.server, expected: res.expected, currentVersion: res.currentVersion });
    }
  }

  if (loading) return <div className="p-4">Loading notes…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!doc) return <div className="p-4">No notes.</div>;

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="border-b px-4 py-2 flex items-center gap-3 bg-white">
        <span className="text-sm text-gray-600">
          Version <code>v{doc.version}</code> • Updated {new Date(doc.updatedAt).toLocaleString()}
        </span>
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        <div className="ml-auto flex gap-2">
          <BtnSecondary onClick={() => setDraft(doc.content)} disabled={!dirty || readOnly}>Revert</BtnSecondary>
          <BtnPrimary onClick={onSave} disabled={!dirty || readOnly}>Save</BtnPrimary>
        </div>
      </div>

      {conflict && (
        <div className="border-b bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-start gap-3">
          <div className="flex-1">
            <strong>Version conflict.</strong> Server is at <code>v{conflict.currentVersion}</code>, your edit was based on <code>v{conflict.expected}</code>.
          </div>
          <div className="flex gap-2">
            <button className="btn border" onClick={useServer}>Use Server</button>
            <button className="btn-primary" onClick={overwriteAnyway}>Overwrite</button>
          </div>
        </div>
      )}

      <div className="min-h-0">
        <textarea className="w-full h-full p-4 outline-none" value={draft} onChange={(e) => setDraft(e.target.value)} readOnly={readOnly}/>
      </div>
    </div>
  );
}

/* ========= Files (server-backed: list/upload/download/delete) ========= */
function isTextLike(name: string, mime: string) {
  return (
    mime.startsWith("text/") ||
    ["application/json", "application/xml", "application/javascript"].includes(mime) ||
    /\.(md|txt|json|xml|csv|log|ts|tsx|js|jsx|css|html)$/i.test(name)
  );
}

function FilesPanel({ workspaceId, readOnly }: { workspaceId: string; readOnly?: boolean }) {
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [active, setActive] = useState<ServerFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewText, setPreviewText] = useState<string>("");

  async function refresh() {
    setErr(null); setLoading(true);
    try {
      await ensureSession();
      const data = await apiListFiles(workspaceId);
      setFiles(data);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [workspaceId]);

  async function uploadOne(file: File) {
    const init: InitUploadResponse = await apiInitUpload(workspaceId, {
      name: file.name,
      mime: file.type || (isTextLike(file.name, file.type) ? "text/plain" : "application/octet-stream"),
      size: file.size,
    });

    const { upload } = init;
    // IMPORTANT: Don't set headers manually; let the browser set multipart/form-data boundary
    if (upload.method === "POST" && "fields" in upload) {
      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v as string));
      form.append("file", file, file.name);
      const res = await fetch(upload.url, { method: "POST", body: form });
      if (!res.ok) throw new Error(`S3 POST failed: ${res.status} ${res.statusText}`);
    } else if (upload.method === "PUT") {
      const res = await fetch((upload as any).url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!res.ok) throw new Error(`S3 PUT failed: ${res.status} ${res.statusText}`);
    } else {
      throw new Error(`Unknown upload method: ${(upload as any).method}`);
    }
  }

  async function onUpload(fl: FileList | null) {
    if (!fl || readOnly) return;
    setErr(null);
    try {
      // upload sequentially (simpler error surfacing)
      for (const f of Array.from(fl)) {
        await uploadOne(f);
      }
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function openPreview(f: ServerFile) {
    try {
      const url = await getDownloadUrl(f.id);
      setPreviewUrl(url);
      setActive(f);
      if (isTextLike(f.name, f.mime)) {
        const r = await fetch(url, { credentials: "include" });
        const t = await r.text();
        setPreviewText(t);
      } else {
        setPreviewText("");
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function remove(fileId: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      await apiDeleteFile(fileId);
      setFiles((xs) => xs.filter((x) => x.id !== fileId));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div className="h-full p-4">
      <label className={`block border-2 border-dashed rounded-xl p-6 text-center ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
        <input type="file" multiple className="hidden" disabled={readOnly} onChange={(e) => onUpload(e.target.files)} />
        Drag & drop or click to upload {readOnly && "(disabled in demo)"}
      </label>

      {err ? <p className="text-sm text-red-600 mt-3">{err}</p> : null}
      {loading ? <p className="text-sm mt-3">Loading files…</p> : null}

      <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((f) => (
          <li key={f.id} className="border rounded-xl p-3 bg-white">
            <div className="font-medium text-sm truncate" title={f.name}>{f.name}</div>
            <div className="text-xs text-gray-500">
              {(f.size / 1024).toFixed(1)} KB • {f.mime || "file"} • {new Date(f.createdAt).toLocaleString()}
            </div>
            <div className="mt-2 flex gap-2">
              <button className="btn-secondary h-8" onClick={() => openPreview(f)} disabled={readOnly}>Open</button>
              <a
                className="btn h-8 border"
                href={previewUrl && active?.id === f.id ? previewUrl : undefined}
                onClick={async (e) => {
                  if (!previewUrl || active?.id !== f.id) {
                    e.preventDefault();
                    const url = await getDownloadUrl(f.id);
                    window.open(url, "_blank");
                  }
                }}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
              <button className="btn h-8 border" onClick={() => remove(f.id)} disabled={readOnly}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={!!active}
        onClose={() => { setActive(null); setPreviewUrl(""); setPreviewText(""); }}
        title={active ? `Preview: ${active.name}` : "Preview"}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => { setActive(null); setPreviewUrl(""); setPreviewText(""); }}>Close</button>
          </div>
        }
      >
        {active && (
          <div className="grid gap-3">
            <div className="grid sm:grid-cols-[1fr,auto] gap-2 items-center">
              <input className="input" value={active.name} readOnly />
              <span className="text-xs text-gray-500">{active.mime || "file"}</span>
            </div>
            {isTextLike(active.name, active.mime) ? (
              <textarea className="w-full h-64 p-3 border rounded-lg outline-none" value={previewText} readOnly />
            ) : active.mime.startsWith("image/") ? (
              <img src={previewUrl} alt={active.name} className="max-h-96 object-contain rounded" />
            ) : active.mime === "application/pdf" ? (
              <iframe title={active.name} src={previewUrl} className="w-full h-96 rounded border" />
            ) : active.mime.startsWith("audio/") ? (
              <audio controls src={previewUrl} className="w-full" />
            ) : active.mime.startsWith("video/") ? (
              <video controls src={previewUrl} className="w-full max-h-96 rounded" />
            ) : (
              <div className="text-sm text-gray-600">No inline preview. Use Download to open the file.</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ========= Tree view / Code panel ========= */
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

  const renameSelected = () => {
    if (!selectedNode || readOnly) return;
    const newName = prompt("New name:", (selectedNode as any).name); if (!newName) return;
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
    if (!confirm(`Delete ${selectedNode.kind} "${(selectedNode as any).name}"? This cannot be undone.`)) return;
    const next = removeNodeById(root, (selectedNode as any).id);
    setRoot(next); setSelectedPath("");
  };

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
          <span className="text-sm text-gray-500 truncate">{selectedNode ? (selectedNode as any).path : "Select a file/folder"}</span>
          <div className="ml-auto flex items-center gap-2">
            <BtnSecondary className="h-8" onClick={renameSelected} disabled={!selectedNode || readOnly}>Rename</BtnSecondary>
            <Button className="h-8 border" onClick={deleteSelected} disabled={!selectedNode || readOnly}>Delete</Button>
          </div>
        </div>

        {selectedNode?.kind === "file" && (
          <div className="border-b bg-white px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Filename:</span>
            <input
              className="flex-1 px-2 py-1 border rounded-md text-sm"
              value={(selectedNode as any).name}
              onChange={(e) => {
                const newName = e.target.value;
                const parent = (selectedNode as any).path.split("/").slice(0, -1).join("/");
                const newPath = [parent, newName].filter(Boolean).join("/");
                setRootMapped((n) => (n.kind === "file" && n.id === (selectedNode as any).id
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
              language={(selectedNode as any).language}
              value={(selectedNode as FileNode).value}
              onChange={(v) => setRootMapped((n) => (n.kind === "file" && n.id === (selectedNode as any).id ? { ...n, value: v ?? "" } : n))}
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
  const { id: workspaceId } = useParams();
  const readOnly = false;
  const { messages, setMessages, tasks, setTasks, members, setMembers, overview, setOverview } = useWorkspaceData();
  const [tab, setTab] = useState<string>("Overview");

  useEffect(() => {
    if (!workspaceId || tab !== "Tasks") return;
    (async () => {
      try {
        await ensureSession();
        const data = await apiListTasks(workspaceId);
        setTasks(data);
      } catch { /* silent */ }
    })();
  }, [workspaceId, tab, setTasks]);

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
        {tab === "Tasks" && workspaceId && (
          <TasksPanel workspaceId={workspaceId} tasks={tasks} setTasks={setTasks} readOnly={readOnly} />
        )}
        {tab === "Notes" && workspaceId && <NotesPanel workspaceId={workspaceId} readOnly={readOnly} />}
        {tab === "Files" && workspaceId && <FilesPanel workspaceId={workspaceId} readOnly={readOnly} />}
        {tab === "Code" && <CodePanel readOnly={readOnly} />}
      </main>
    </div>
  );
}
