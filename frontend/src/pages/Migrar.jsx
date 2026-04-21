import { useState } from "react";
import { migrarDesdeLocalStorage } from "../store";

export default function Migrar() {
  const [estado, setEstado] = useState(null); // null | 'cargando' | { ok, msg }

  async function ejecutar() {
    setEstado('cargando');
    const resultado = await migrarDesdeLocalStorage();
    setEstado(resultado);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col gap-5 shadow-2xl">
        <div className="text-center">
          <div className="text-4xl mb-2">🔄</div>
          <h1 className="text-lg font-bold text-white">Recuperar datos</h1>
          <p className="text-xs text-gray-500 mt-1">
            Abre esta página desde el celular donde tenías los datos guardados y toca el botón.
          </p>
        </div>

        {estado === null && (
          <button
            onClick={ejecutar}
            className="w-full py-3 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors"
          >
            Subir mis datos a Firebase
          </button>
        )}

        {estado === 'cargando' && (
          <div className="text-center text-gray-400 text-sm py-4 animate-pulse">
            Migrando datos... por favor espera
          </div>
        )}

        {estado && estado !== 'cargando' && (
          <div className={`rounded-xl p-4 text-sm text-center ${estado.ok ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {estado.msg}
          </div>
        )}

        {estado?.ok && (
          <p className="text-xs text-gray-500 text-center">
            Ya puedes cerrar esta página y volver a la app normalmente. Todos verán los datos.
          </p>
        )}

        <a href="#/" className="text-xs text-gray-600 hover:text-gray-400 text-center">
          ← Volver al inicio
        </a>
      </div>
    </div>
  );
}
