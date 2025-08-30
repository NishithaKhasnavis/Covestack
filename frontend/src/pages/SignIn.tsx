import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, signIn } from "@/lib/auth";

export default function SignIn() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      signIn(name.trim() || email.trim(), email.trim(), passcode.trim());
      await ensureSession(); // sets cookie on the server
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form className="w-full max-w-md bg-white border rounded-xl p-6 shadow-soft" onSubmit={submit}>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-gray-600 mt-1">Local passcode auth for dev.</p>

        <div className="grid gap-3 mt-4">
          <input className="input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" placeholder="Passcode" value={passcode} onChange={e => setPasscode(e.target.value)} />
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button className="btn-primary h-10" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </div>
      </form>
    </div>
  );
}
