import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAutenticado } from "./store";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Finanzas from "./pages/Finanzas";
import AccesoCliente from "./pages/AccesoCliente";

function AdminRoute({ children }) {
  const [auth, setAuth] = useState(() => isAutenticado());
  if (!auth) return <Login onLogin={() => setAuth(true)} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/finanzas" element={<AdminRoute><Finanzas /></AdminRoute>} />
        <Route path="/acceso" element={<AccesoCliente />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
