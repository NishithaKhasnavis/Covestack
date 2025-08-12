// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import CoveWorkspacePage from "./pages/CoveWorkspace.tsx";
import DemoWorkspacePage from "./pages/DemoWorkspace.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/cove/demo" element={<DemoWorkspacePage />} />
        <Route path="/cove/:id" element={<CoveWorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}
