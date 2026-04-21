import { useState } from "react";
import { buscarPorPlacaYCodigo, calcularVencimiento, reportarNovedad } from "../store";

function fmt(n) {
  return "$" + Number(n).toLocaleString("es-CO");
}

function fmtFecha(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

export default function AccesoCliente() {
  const [placa, setPlaca]     = useState("");
  const [codigo, setCodigo]   = useState("");
  const [puesto, setPuesto]   = useState(null);
  const [error, setError]     = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [modalNovedad, setModalNovedad] = useState(false);
  const [novedad, setNovedad] = useState({ tipo: "otro", descripcion: "" });
  const [novedadOk, setNovedadOk] = useState(false);
  const [mostrarCanny, setMostrarCanny] = useState(false);
  const [mostrarVimtag, setMostrarVimtag] = useState(false);
  const [vimtagError, setVimtagError] = useState(false);

  async function buscar(e) {
    e.preventDefault();
    const resultado = await buscarPorPlacaYCodigo(placa, codigo);
    setBuscado(true);
    if (resultado && resultado.estado !== "libre") {
      setPuesto(resultado);
      setError(false);
    } else {
      setPuesto(null);
      setError(true);
    }
  }

  function volver() {
    setPuesto(null);
    setError(false);
    setBuscado(false);
    setPlaca("");
    setCodigo("");
    setMostrarCanny(false);
  }

  async function enviarNovedad(e) {
    e.preventDefault();
    if (!novedad.descripcion.trim()) return;
    await reportarNovedad({
      puesto: puesto.numero,
      placa: puesto.placa,
      nombre: puesto.nombre,
      tipo: novedad.tipo,
      descripcion: novedad.descripcion.trim(),
    });
    setNovedadOk(true);
    setTimeout(() => {
      setModalNovedad(false);
      setNovedad({ tipo: "otro", descripcion: "" });
      setNovedadOk(false);
    }, 2000);
  }

  // --- Vista de datos del cliente ---
  if (puesto) {
    const alDia = puesto.pagado === true;
    const venc = calcularVencimiento(puesto.fechaInicio, puesto.duracion, puesto.pagado, puesto.fechaUltimoPago || null);
    const diasRestantes = venc?.diasRestantes ?? null;

    return (
      <>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className={`w-full max-w-xs rounded-2xl border-2 p-6 flex flex-col gap-4 shadow-2xl ${
            alDia ? "border-green-500/40 bg-green-950/10" : "border-red-500/40 bg-red-950/10"
          }`}>

            {/* Header con boton cerrar */}
            <div className="flex items-start justify-between">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Puesto</p>
                <p className="text-7xl font-black text-white leading-none">{String(puesto.numero).padStart(2,"0")}</p>
                <p className="text-gray-300 font-semibold mt-1">{puesto.nombre}</p>
              </div>
              <button
                onClick={volver}
                className="ml-2 mt-1 shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white transition-colors text-sm"
                title="Cerrar sesion"
              >
                x
              </button>
            </div>

            {/* Datos del vehiculo */}
            <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Vehiculo</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Placa</span>
                <span className="text-white font-mono font-bold">{puesto.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="text-white">{puesto.tipo === "camioneta" ? "Camioneta" : "Automovil"}</span>
              </div>
              {puesto.color && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Color / marca</span>
                  <span className="text-white">{puesto.color}</span>
                </div>
              )}
            </div>

            {/* Contrato */}
            <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Contrato</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Inicio</span>
                <span className="text-white">{fmtFecha(puesto.fechaInicio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modalidad</span>
                <span className="text-white">{puesto.duracion === "mes" ? "Mensual" : "Por dia"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor</span>
                <span className="text-white font-bold">{fmt(puesto.precio)}</span>
              </div>
            </div>

            {/* Countdown vencimiento */}
            {venc && (
              <div className={`rounded-xl px-4 py-4 text-center border ${
                !alDia && venc.diasMora > 0
                  ? "bg-red-500/10 border-red-500/40"
                  : !alDia && venc.diasMora === 0
                  ? "bg-yellow-500/10 border-yellow-500/40"
                  : diasRestantes !== null && diasRestantes <= 5
                  ? "bg-yellow-500/10 border-yellow-500/40"
                  : "bg-gray-800/50 border-gray-700"
              }`}>
                {!alDia && venc.diasMora > 0 ? (
                  <>
                    <p className="text-red-400 text-2xl font-black">Mora</p>
                    <p className="text-red-300 text-4xl font-black mt-1">{venc.diasMora}</p>
                    <p className="text-red-400 text-sm font-semibold">{venc.diasMora === 1 ? "dia sin pagar" : "dias sin pagar"}</p>
                    <p className="text-red-400/70 text-xs mt-1">
                      Vencio el {venc.anclaActual.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </>
                ) : !alDia && venc.diasMora === 0 ? (
                  <>
                    <p className="text-yellow-400 text-lg font-black">Vence HOY</p>
                    <p className="text-gray-500 text-xs mt-1">Realiza tu pago antes de medianoche.</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Proximo pago</p>
                    <p className={`text-4xl font-black ${diasRestantes !== null && diasRestantes <= 5 ? "text-yellow-400" : "text-white"}`}>
                      {diasRestantes}
                    </p>
                    <p className={`text-sm font-semibold ${diasRestantes !== null && diasRestantes <= 5 ? "text-yellow-400" : "text-gray-400"}`}>
                      {diasRestantes === 1 ? "dia restante" : "dias restantes"}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {venc.fechaPago.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    {venc.diasTarde > 0 && (
                      <p className="text-yellow-600 text-[10px] mt-1">Ultimo pago recibido {venc.diasTarde} {venc.diasTarde === 1 ? "dia" : "dias"} tarde</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Estado pago */}
            {alDia ? (
              <div className="rounded-xl px-4 py-3 text-center bg-green-500/10 border border-green-500/20 text-green-400">
                <p className="font-bold">Pago al dia</p>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 text-center bg-red-500/10 border border-red-500/20 text-red-400">
                <p className="font-bold">Pago pendiente</p>
                <p className="text-xs text-gray-500 mt-1">Comunicate con el administrador.</p>
              </div>
            )}

            {/* Camara / QR */}
            {puesto.camara ? (
              <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col items-center gap-3">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Ver mi camara</p>

                {/* QR */}
                <div className="bg-white rounded-xl p-2 shadow-lg">
                  <img src={puesto.camara} alt="QR camara" className="w-40 h-40 object-contain" />
                </div>

                {/* Opcion 1 — ver en web (modal pantalla completa) */}
                <button
                  onClick={() => { setMostrarVimtag(true); setVimtagError(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl text-sm font-semibold hover:bg-blue-600/40 transition-colors"
                >
                  Ver camara desde el navegador
                </button>

                {/* Opcion 2  instrucciones Canny Cam (colapsable) */}
                <button
                  onClick={() => setMostrarCanny(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <span>Ver desde la app Canny Cam (instrucciones)</span>
                  <span className="text-gray-600 ml-2">{mostrarCanny ? "" : ""}</span>
                </button>

                {mostrarCanny && (
                  <div className="w-full bg-gray-900/60 rounded-xl p-3 flex flex-col gap-2 text-xs border border-gray-700">
                    <ol className="text-gray-300 flex flex-col gap-2 list-decimal list-inside">
                      <li>
                        Descarga la app <span className="text-white font-semibold">Canny Cam</span>
                        <div className="flex gap-2 mt-1 ml-4">
                          <a href="https://play.google.com/store/search?q=canny+cam" target="_blank" rel="noopener noreferrer"
                            className="px-2 py-1 bg-green-700/40 text-green-300 rounded-lg hover:bg-green-700/60">
                            Google Play
                          </a>
                          <a href="https://apps.apple.com/search?term=canny+cam" target="_blank" rel="noopener noreferrer"
                            className="px-2 py-1 bg-blue-700/40 text-blue-300 rounded-lg hover:bg-blue-700/60">
                            App Store
                          </a>
                        </div>
                      </li>
                      <li>Abre la app y toca <span className="text-white font-semibold">"Agregar camara"</span></li>
                      <li>Selecciona <span className="text-white font-semibold">"Escanear QR"</span> y apunta al codigo de arriba</li>
                      <li>La camara aparecera automaticamente en tu lista</li>
                      <li>Tocala para ver la imagen <span className="text-white font-semibold">en tiempo real</span></li>
                    </ol>
                    <button
                      onClick={() => setMostrarCanny(false)}
                      className="mt-1 text-[10px] text-gray-600 hover:text-gray-400 text-center"
                    >
                      Cerrar instrucciones
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-gray-800 text-gray-600 font-bold rounded-xl py-3 select-none text-sm">
                Sin camara asignada
              </div>
            )}

            {/* Botones inferiores: Cerrar y Reportar novedad */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={volver}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors text-sm font-semibold"
              >
                Cerrar
              </button>
              <button
                onClick={() => setModalNovedad(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-semibold"
              >
                Reportar novedad
              </button>
            </div>

          </div>
        </div>

        {/* Modal fullscreen Vimtag */}
        {mostrarVimtag && (
          <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
            {/* Barra superior */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Ver mi camara</span>
                <span className="text-[10px] text-yellow-400">Activa "Sitio de escritorio" en tu navegador si no carga bien</span>
              </div>
              <button
                onClick={() => setMostrarVimtag(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white text-base font-bold"
              >
                x
              </button>
            </div>

            {/* Iframe o fallback */}
            {!vimtagError ? (
              <iframe
                src="https://www.vimtag.com/device?hl=en"
                title="Vimtag camara"
                className="flex-1 w-full"
                style={{border: "none"}}
                allow="camera; fullscreen"
                onError={() => setVimtagError(true)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-gray-400 text-sm text-center">El sitio no permite verse embebido desde este navegador.</p>
                <a
                  href="https://www.vimtag.com/device?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                >
                  Abrir vimtag.com en nueva pestana
                </a>
                <button onClick={() => setMostrarVimtag(false)} className="text-xs text-gray-600 hover:text-gray-400">
                  Volver
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal reportar novedad */}
        {modalNovedad && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <form onSubmit={enviarNovedad}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4"
            >
              <h2 className="text-base font-bold text-white text-center">Reportar novedad</h2>
              <p className="text-xs text-gray-500 text-center -mt-2">Puesto {puesto.numero} - {puesto.placa}</p>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tipo</p>
                <div className="flex gap-2">
                  {[["dano","Dano"],["robo","Robo"],["otro","Otro"]].map(([v,l]) => (
                    <button key={v} type="button"
                      onClick={() => setNovedad(n => ({ ...n, tipo: v }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        novedad.tipo === v ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400"
                      }`}>{l}</button>
                  ))}
                </div>
              </div>
              <textarea rows={3} placeholder="Describe la novedad..."
                value={novedad.descripcion}
                onChange={e => setNovedad(n => ({ ...n, descripcion: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none"
              />
              {novedadOk && <p className="text-green-400 text-xs text-center">Novedad enviada al administrador</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalNovedad(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm">Cancelar</button>
                <button type="submit"
                  className="flex-1 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400">Enviar</button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  }

  // --- Pantalla de login ---
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col gap-6">

        <div className="text-center">
          <p className="text-4xl mb-3">P</p>
          <h1 className="text-2xl font-black text-white">ParkSanJoseph</h1>
          <p className="text-gray-500 text-sm mt-1">Consulta tu puesto de parqueo</p>
        </div>

        <form onSubmit={buscar} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Placa del vehiculo</label>
            <input
              value={placa}
              onChange={e => setPlaca(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-gray-700 focus:outline-none focus:border-green-500 uppercase"
              autoCapitalize="characters"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">
              Codigo de acceso <span className="normal-case text-gray-600">(ultimos 4 digitos de tu cedula)</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
              placeholder="..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest placeholder-gray-700 focus:outline-none focus:border-green-500"
            />
          </div>

          {buscado && error && (
            <p className="text-red-400 text-sm text-center">No se encontro ningun puesto con esos datos.</p>
          )}

          <button type="submit"
            className="w-full py-3 rounded-xl bg-green-500 text-black font-bold text-base hover:bg-green-400 transition-colors mt-1"
          >
            Consultar
          </button>
        </form>

        <p className="text-[10px] text-gray-600 text-center">
          Si no recuerdas tu codigo, contacta al administrador.
        </p>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-[10px] text-gray-600 flex flex-col gap-1 leading-relaxed">
          <p className="text-gray-500 font-semibold text-xs mb-1">Aviso de responsabilidad</p>
          <p>El parqueadero no se hace responsable por danos, perdidas, hurtos o deterioro de los vehiculos ni de los objetos dejados en su interior.</p>
          <p>Las camaras de vigilancia son de uso exclusivo del propietario del parqueadero para fines de seguridad. Las imagenes son privadas y no seran compartidas con terceros salvo requerimiento legal.</p>
          <p>Al consultar este portal, el usuario acepta estos terminos.</p>
        </div>
      </div>
    </div>
  );
}
