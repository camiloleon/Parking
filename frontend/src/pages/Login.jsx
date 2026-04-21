import { useState } from "react";
import { login } from "../store";
// login is now async (Firebase)

export default function Login({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  async function intentar(e) {
    e.preventDefault();
    if (await login(pin)) {
      onLogin();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form
        onSubmit={intentar}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-10 flex flex-col gap-6 w-full max-w-xs shadow-2xl"
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🅿️</div>
          <h1 className="text-xl font-bold text-white tracking-widest">ParkSanJoseph</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Panel Administrativo</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">PIN de acceso</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={e => setPin(e.target.value)}
            className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none ${
              error ? "border-red-500 animate-pulse" : "border-gray-700 focus:border-green-500"
            }`}
            placeholder="••••"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs text-center mt-2">PIN incorrecto</p>}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
