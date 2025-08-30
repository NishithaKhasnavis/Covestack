import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "@/lib/auth";

export default function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("you@virginia.edu");
  const [name, setName] = useState("Nishitha");
  const [code, setCode] = useState(""); // matches ACCESS_CODE in backend .env
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signIn(name.trim(), email.trim(), code.trim());
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white border rounded-2xl p-6 shadow-soft">
        <h1 className="text-xl font-semibold mb-4">Sign in to CoveStack</h1>
        <div className="grid gap-3">
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            placeholder="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button className="btn-primary" disabled={loading || !email || !code}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-gray-500">
            Tip: access code must match your backend <code>ACCESS_CODE</code> in <code>.env</code> (e.g. <code>letmein-123</code>).
          </p>
        </div>
      </form>
    </div>
  );
}
