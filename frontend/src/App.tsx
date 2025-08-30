// src/App.tsx
import React, { ReactNode, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import MainPage from "./pages/MainPage";
import CoveWorkspacePage from "./pages/CoveWorkspace";
import DemoWorkspace from "./pages/DemoWorkspace";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";

import { getUser, ensureSession } from "./lib/auth";

function Loading() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      Checking session…
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "redir">("loading");
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getUser()) {
        if (!cancelled) setState("ok");
        return;
      }
      try {
        const u = await ensureSession(); // should return User | null
        const authed = Boolean(u);
        if (!cancelled) setState(authed ? "ok" : "redir");
      } catch {
        if (!cancelled) setState("redir");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <Loading />;

  return state === "ok" ? (
    <>{children}</>
  ) : (
    <Navigate to="/signin" replace state={{ from: location.pathname }} />
  );
}

function PublicOnly({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "redir">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getUser()) {
        if (!cancelled) setState("redir");
        return;
      }
      try {
        const u = await ensureSession(); // User | null
        const authed = Boolean(u);
        if (!cancelled) setState(authed ? "redir" : "ok");
      } catch {
        if (!cancelled) setState("ok");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <Loading />;
  return state === "ok" ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<MainPage />} />
        <Route
          path="/signin"
          element={
            <PublicOnly>
              <SignIn />
            </PublicOnly>
          }
        />
        <Route path="/cove/demo" element={<DemoWorkspace />} />

        {/* Private */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/cove/:id"
          element={
            <PrivateRoute>
              <CoveWorkspacePage />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
