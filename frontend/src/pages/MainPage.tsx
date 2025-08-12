// src/pages/MainPage.tsx
import { Link, useNavigate } from "react-router-dom";
import { getUser } from "@/lib/auth";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold" aria-label="CoveStack Home">
      <div className="h-9 w-9 rounded-xl bg-brand-600 text-white grid place-items-center shadow-soft">CS</div>
      <span className="text-xl">CoveStack</span>
    </Link>
  );
}

function TopNav() {
  const user = getUser();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="opacity-80 hover:opacity-100">Features</a>
          <a href="#pricing" className="opacity-80 hover:opacity-100">Pricing</a>
          <a href="#faq" className="opacity-80 hover:opacity-100">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/signin" className="btn-secondary">Sign in</Link>
              <Link to="/cove/demo" className="btn-secondary">Live demo</Link>
              <Link to="/signin" className="btn-primary">Create a Cove</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
              <Link to="/cove/demo" className="btn-secondary">Live demo</Link>
              <Link to="/dashboard" className="btn-primary">Create a Cove</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function MainPage() {
  const navigate = useNavigate();
  const user = getUser();

  const createAndGo = () => {
    if (!user) {
      navigate("/signin");
      return;
    }
    const id = Math.random().toString(36).slice(2, 8);
    navigate(`/cove/${id}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <TopNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 to-white" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Collaborate faster with your <span className="text-brand-700">Cove</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              A cloud-native workspace for small learning circles, hackathon teams, and early-stage pods. Chat, tasks,
              notes, and files—together and in real time.
            </p>
            <div className="mt-8 flex gap-3">
              <button onClick={createAndGo} className="btn-primary">Create your Cove</button>
              <Link to="/cove/demo" className="btn-secondary">Explore demo</Link>
              {!user && <Link to="/signin" className="btn-secondary">Sign in</Link>}
            </div>
            <div className="mt-6 text-sm text-gray-500">No sign-up required for demo.</div>
          </div>

          <div className="card p-4 lg:p-6">
            <div className="aspect-video w-full rounded-xl border bg-dots grid place-items-center">
              <span className="text-sm text-gray-500">(Product preview placeholder)</span>
            </div>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { title: "Real-time Chat", desc: "Low-latency messaging with typing indicators." },
                { title: "Tasks Board", desc: "Kanban-style tracking with assignees & due dates." },
                { title: "Notes", desc: "Collaborative docs with slash commands." },
                { title: "Files", desc: "Drag & drop uploads, previews, and comments." },
              ].map((f) => (
                <li key={f.title} className="p-4 border rounded-xl bg-white">
                  <div className="font-medium">{f.title}</div>
                  <div className="text-gray-600 mt-1">{f.desc}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { h: "Pods by default", p: "Work in focused spaces with roles, invites, and quick-start templates." },
            { h: "Fast & familiar", p: "Keyboard-first UI, markdown, @mentions, and command palette." },
            { h: "Built for scale", p: "Solid foundations (React, Router, FastAPI/Node, Postgres, Redis, AWS)." },
          ].map((x) => (
            <article key={x.h} className="p-6 border rounded-2xl bg-white shadow-soft">
              <h3 className="font-semibold text-lg">{x.h}</h3>
              <p className="mt-2 text-gray-600">{x.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="p-6 border rounded-2xl bg-white shadow-soft">
            <h3 className="text-xl font-semibold">Free while in beta</h3>
            <p className="mt-2 text-gray-600">Unlimited cove workspaces for individuals and small teams.</p>
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-gray-500">© {new Date().getFullYear()} CoveStack</footer>
    </div>
  );
}
