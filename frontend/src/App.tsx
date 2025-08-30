import React, { ReactNode, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./pages/MainPage";
import CoveWorkspacePage from "./pages/CoveWorkspace";
import DemoWorkspace from "./pages/DemoWorkspace";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import { getUser, ensureSession } from "./lib/auth";

function PrivateRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "redir">("loading");

  useEffect(() => {
    (async () => {
      // if we have a cached user, allow immediately
      if (getUser()) {
        setState("ok");
        return;
      }
      // otherwise, ask the backend (/me) using the cookie
      const u = await ensureSession(); // sets local cache if cookie is valid
      setState(u ? "ok" : "redir");
    })();
  }, []);

  if (state === "loading") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Checking session…
      </div>
    );
  }
  return state === "ok" ? <>{children}</> : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/signin" element={<SignIn />} />
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
        <Route path="/cove/demo" element={<DemoWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}
