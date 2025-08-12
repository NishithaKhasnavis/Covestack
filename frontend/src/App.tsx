import React, { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./pages/MainPage";
import CoveWorkspacePage from "./pages/CoveWorkspace";
import DemoWorkspace from "./pages/DemoWorkspace";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import { getUser } from "./lib/auth";

function PrivateRoute({ children }: { children: ReactNode }) {
  const u = getUser();
  return u && u.passcode ? <>{children}</> : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/cove/:id" element={<PrivateRoute><CoveWorkspacePage /></PrivateRoute>} />
        <Route path="/cove/demo" element={<DemoWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}
