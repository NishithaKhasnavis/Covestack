import { useParams } from "react-router-dom";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export default function Cove() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold capitalize">{id?.replace(/-/g, " ")}</h1>
          <p className="text-sm text-muted-foreground">
            Manage members, chat, tasks, code, and docs.
          </p>
        </div>
      </header>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="todo">To-Do</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MembersPanel />
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ChatPanel />
        </TabsContent>

        <TabsContent value="todo" className="mt-4">
          <TodoPanel />
        </TabsContent>

        <TabsContent value="code" className="mt-4">
          <CodePanel />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <DocsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --- Panels --- */

function MembersPanel() {
  const [members, setMembers] = useState<string[]>(["nishitha@example.com"]);
  const [email, setEmail] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle>Members</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Add by email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={() => email && setMembers([email, ...members])}>Add</Button>
        </div>
        <ul className="list-disc pl-6 text-sm text-muted-foreground">
          {members.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<string[]>(["Welcome to the cove! 🎉"]);
  const [text, setText] = useState("");
  function send() {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, text]);
    setText("");
  }
  return (
    <Card>
      <CardHeader><CardTitle>Chat</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="h-48 overflow-y-auto rounded-md border p-3 text-sm">
          {messages.map((m, i) => (<p key={i} className="mb-1">{m}</p>))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}

type Task = { id: number; title: string; done: boolean };
function TodoPanel() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Create repo", done: true },
    { id: 2, title: "Set up frontend", done: false },
  ]);
  const [title, setTitle] = useState("");
  function add() {
    if (!title.trim()) return;
    setTasks((t) => [{ id: Date.now(), title, done: false }, ...t]);
    setTitle("");
  }
  return (
    <Card>
      <CardHeader><CardTitle>To-Do</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}>Add</Button>
        </div>
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={t.done}
                  onChange={() => setTasks(tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                />
                <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
              </div>
              <Button variant="ghost" onClick={() => setTasks(tasks.filter(x => x.id !== t.id))}>Remove</Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CodePanel() {
  const [url, setUrl] = useState("https://github.com/NishithaKhasnavis/CoveStack");
  return (
    <Card>
      <CardHeader><CardTitle>Code</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button asChild><a href={url} target="_blank" rel="noreferrer">Open</a></Button>
        </div>
        <p className="text-sm text-muted-foreground">Paste a GitHub link to open it in a new tab.</p>
      </CardContent>
    </Card>
  );
}

function DocsPanel() {
  const [text, setText] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle>Docs / Notes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea placeholder="Write instructions, notes, or decisions…" className="min-h-[200px]" value={text} onChange={(e) => setText(e.target.value)} />
      </CardContent>
    </Card>
  );
}
