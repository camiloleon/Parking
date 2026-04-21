import { useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAutenticado } from "./store";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Finanzas from "./pages/Finanzas";
import AccesoCliente from "./pages/AccesoCliente";
import Migrar from "./pages/Migrar";

function AdminRoute({ children }) {
  const [auth, setAuth] = useState(() => isAutenticado());
  if (!auth) return <Login onLogin={() => setAuth(true)} />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/finanzas" element={<AdminRoute><Finanzas /></AdminRoute>} />
        <Route path="/acceso" element={<AccesoCliente />} />
        <Route path="/migrar" element={<Migrar />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
}
