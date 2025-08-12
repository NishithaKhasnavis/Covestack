import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn, getUser } from "@/lib/auth";

export default function SignIn() {
  const navigate = useNavigate();
  const existing = getUser();
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [passcode, setPasscode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetup = !!existing?.passcode;

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="w-[min(92vw,480px)] bg-white border rounded-2xl p-6 shadow-soft">
        <h1 className="text-xl font-semibold">
          {isSetup ? "Enter passcode to continue" : "Create your CoveStack passcode"}
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          Placeholder only — stored locally and <span className="font-medium">not secure</span>. We’ll wire real auth later.
        </p>

        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!name.trim() || !email.trim() || !passcode.trim()) {
              setError("Please fill in all fields.");
              return;
            }
            if (!isSetup && passcode.trim().length < 4) {
              setError("Passcode must be at least 4 characters.");
              return;
            }
            try {
              signIn(name.trim(), email.trim(), passcode.trim());
              navigate("/dashboard");
            } catch (err: any) {
              setError(err?.message || "Sign-in failed.");
            }
          }}
        >
          <label className="grid gap-1">
            <span className="text-sm">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
          </label>

          <label className="grid gap-1">
            <span className="text-sm">{isSetup ? "Passcode" : "Choose a passcode"}</span>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                type={show ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={isSetup ? "Enter your passcode" : "Create a passcode"}
              />
              <button type="button" className="btn border" onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button className="btn-primary mt-2" type="submit">{isSetup ? "Continue" : "Save & Continue"}</button>
        </form>

        <div className="mt-4 text-sm flex items-center justify-between">
          <Link className="text-brand-700 hover:underline" to="/">← Back to home</Link>
          <span className="text-gray-500">Demo available without sign-in</span>
        </div>
      </div>
    </div>
  );
}
