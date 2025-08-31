// src/pages/SignIn.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInPasscode } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

export default function SignIn() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signInPasscode(name.trim(), email.trim(), code.trim());
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function signInWithGoogle() {
    // <-- THIS is where ${API_BASE}/auth/google/start goes.
    window.location.href = `${API_BASE}/auth/google/start`;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <form className="w-full max-w-md bg-white border rounded-2xl p-6 shadow-soft" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-gray-600 mt-1">Local passcode auth for dev.</p>

        <div className="mt-4 grid gap-3">
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Passcode (letmein-123)" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>

        {err && <div className="mt-3 text-sm text-red-600">Error: {err}</div>}

        <button className="btn-primary w-full mt-4" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-500">or</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button type="button" className="btn w-full mt-4 border" onClick={signInWithGoogle}>
          Continue with Google
        </button>
      </form>
    </div>
  );
}
