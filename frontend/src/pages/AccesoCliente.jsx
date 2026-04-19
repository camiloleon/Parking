import { useState, useEffect } from "react";
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
  const [camaraTab, setCamaraTab] = useState("vimtag");

  function buscar(e) {
    e.preventDefault();
    const resultado = buscarPorPlacaYCodigo(placa, codigo);
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
  }

  function enviarNovedad(e) {
    e.preventDefault();
    if (!novedad.descripcion.trim()) return;
    reportarNovedad({
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
    const venc = calcularVencimiento(puesto.fechaInicio, puesto.duracion, puesto.fechaUltimoPago || null);
    const diasRestantes = venc?.diasRestantes ?? null;

    return (
      <>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className={`w-full max-w-xs rounded-2xl border-2 p-6 flex flex-col gap-4 shadow-2xl ${
            alDia ? "border-green-500/40 bg-green-950/10" : "border-red-500/40 bg-red-950/10"
          }`}>

            {/* Header */}
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Puesto</p>
              <p className="text-7xl font-black text-white leading-none">{String(puesto.numero).padStart(2,"0")}</p>
              <p className="text-gray-300 font-semibold mt-1">{puesto.nombre}</p>
            </div>

            {/* Datos del vehículo */}
            <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Vehículo</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Placa</span>
                <span className="text-white font-mono font-bold">{puesto.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="text-white">{puesto.tipo === "camioneta" ? " Camioneta" : " Automóvil"}</span>
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
                <span className="text-white">{puesto.duracion === "mes" ? "Mensual" : "Por día"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor</span>
                <span className="text-white font-bold">{fmt(puesto.precio)}</span>
              </div>
            </div>

            {/* Countdown vencimiento */}
            {venc && (
              <div className={`rounded-xl px-4 py-4 text-center border ${
                venc.vencido || diasRestantes === 0
                  ? "bg-red-500/10 border-red-500/40"
                  : diasRestantes <= 5
                  ? "bg-yellow-500/10 border-yellow-500/40"
                  : "bg-gray-800/50 border-gray-700"
              }`}>
                {venc.vencido ? (
                  <>
                    <p className="text-red-400 text-2xl font-black"> VENCIDO</p>
                    <p className="text-red-400/80 text-xs mt-1">
                      Venció el {venc.fechaPago.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </>
                ) : diasRestantes === 0 ? (
                  <>
                    <p className="text-red-400 text-lg font-black"> Vence HOY</p>
                    <p className="text-gray-500 text-xs mt-1">Realiza tu pago antes de medianoche.</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Próximo pago</p>
                    <p className={`text-4xl font-black ${diasRestantes <= 5 ? "text-yellow-400" : "text-white"}`}>
                      {diasRestantes}
                    </p>
                    <p className={`text-sm font-semibold ${diasRestantes <= 5 ? "text-yellow-400" : "text-gray-400"}`}>
                      {diasRestantes === 1 ? "día restante" : "días restantes"}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {venc.fechaPago.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Estado pago */}
            {alDia ? (
              <div className="rounded-xl px-4 py-3 text-center bg-green-500/10 border border-green-500/20 text-green-400">
                <p className="font-bold"> Pago al día</p>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 text-center bg-red-500/10 border border-red-500/20 text-red-400">
                <p className="font-bold"> Pago pendiente</p>
                <p className="text-xs text-gray-500 mt-1">Comunícate con el administrador.</p>
              </div>
            )}

            {/* Cámara QR — Vimtag y Canny Cam */}
            {puesto.camara ? (
              <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col items-center gap-3">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Ver mi cámara</p>

                {/* QR grande */}
                <div className="bg-white rounded-2xl p-3 shadow-lg">
                  <img src={puesto.camara} alt="QR cámara" className="w-48 h-48 object-contain" />
                </div>
                <p className="text-[11px] text-gray-500 text-center -mt-1">Escanea este QR con la app de tu preferencia</p>

                {/* Tabs */}
                <div className="flex w-full gap-1 bg-gray-900 rounded-xl p-1">
                  <button
                    onClick={() => setCamaraTab("vimtag")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${camaraTab === "vimtag" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    🌐 Vimtag
                  </button>
                  <button
                    onClick={() => setCamaraTab("canny")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${camaraTab === "canny" ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"}`}
                  >
                    📱 Canny Cam
                  </button>
                </div>

                {/* Tab Vimtag */}
                {camaraTab === "vimtag" && (
                  <div className="w-full bg-gray-900/70 rounded-xl p-3 flex flex-col gap-3 text-xs">
                    <p className="text-blue-400 font-bold text-center text-sm">🌐 Ver con Vimtag</p>
                    <p className="text-gray-400 text-center text-[11px]">Accede desde el navegador o la app oficial Vimtag.</p>
                    <a
                      href="https://cloud.vimtag.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg font-semibold hover:bg-blue-600/50 transition-colors"
                    >
                      🌐 Abrir Vimtag en el navegador
                    </a>
                    <p className="text-gray-500 text-[11px] text-center">O descarga la app oficial:</p>
                    <div className="flex gap-2">
                      <a href="https://play.google.com/store/search?q=vimtag" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center py-2 bg-green-700/30 text-green-300 rounded-lg text-[11px] font-semibold hover:bg-green-700/50">
                        ▶ Google Play
                      </a>
                      <a href="https://apps.apple.com/search?term=vimtag" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center py-2 bg-gray-700/50 text-gray-300 rounded-lg text-[11px] font-semibold hover:bg-gray-700/70">
                         App Store
                      </a>
                    </div>
                    <ol className="text-gray-400 flex flex-col gap-1.5 list-decimal list-inside mt-1">
                      <li>Crea cuenta gratuita en <span className="text-white">cloud.vimtag.com</span></li>
                      <li>Inicia sesión en la app Vimtag</li>
                      <li>Toca <span className="text-white">"Agregar dispositivo"</span> y escanea el QR</li>
                      <li>Verás tu cámara en tiempo real</li>
                    </ol>
                  </div>
                )}

                {/* Tab Canny Cam */}
                {camaraTab === "canny" && (
                  <div className="w-full bg-gray-900/70 rounded-xl p-3 flex flex-col gap-3 text-xs">
                    <p className="text-green-400 font-bold text-center text-sm">📱 Ver con Canny Cam</p>
                    <p className="text-gray-400 text-center text-[11px]">Compatible con Vimtag y la mayoría de marcas RTSP/IP.</p>
                    <div className="flex gap-2">
                      <a href="https://play.google.com/store/search?q=canny+cam" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center py-2 bg-green-700/30 text-green-300 rounded-lg text-[11px] font-semibold hover:bg-green-700/50">
                        ▶ Google Play
                      </a>
                      <a href="https://apps.apple.com/search?term=canny+cam" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center py-2 bg-gray-700/50 text-gray-300 rounded-lg text-[11px] font-semibold hover:bg-gray-700/70">
                         App Store
                      </a>
                    </div>
                    <ol className="text-gray-400 flex flex-col gap-1.5 list-decimal list-inside mt-1">
                      <li>Descarga <span className="text-white font-semibold">Canny Cam</span></li>
                      <li>Toca <span className="text-white">"Agregar cámara"</span></li>
                      <li>Selecciona <span className="text-white">"Escanear QR"</span> y apunta al código de arriba</li>
                      <li>La cámara aparece en tu lista automáticamente</li>
                      <li>Tócala para ver en <span className="text-white font-semibold">tiempo real</span></li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 flex flex-col items-center gap-1 text-center">
                <p className="text-gray-500 text-sm font-semibold"> Sin QR de cámara</p>
                <p className="text-gray-600 text-xs">El administrador aún no ha configurado la cámara para este puesto.</p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setModalNovedad(true)}
                className="flex items-center justify-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-semibold rounded-xl py-3 hover:bg-yellow-500/20 transition-colors text-sm"
              >
                 Reportar novedad
              </button>
              <button
                onClick={volver}
                className="flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-semibold rounded-xl py-3 hover:bg-gray-700 transition-colors text-sm"
              >
                 Ver otro puesto
              </button>
            </div>
          </div>
        </div>

        {/* Modal reportar novedad */}
        {modalNovedad && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <form onSubmit={enviarNovedad}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4"
            >
              <h2 className="text-base font-bold text-white text-center"> Reportar novedad</h2>
              <p className="text-xs text-gray-500 text-center -mt-2">Puesto {puesto.numero}  {puesto.placa}</p>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tipo</p>
                <div className="flex gap-2">
                  {[["dano"," Daño"],["robo"," Robo"],["otro"," Otro"]].map(([v,l]) => (
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
              {novedadOk && <p className="text-green-400 text-xs text-center"> Novedad enviada al administrador</p>}
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

  // --- Pantalla de login por placa + código ---
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col gap-6">

        <div className="text-center">
          <p className="text-4xl mb-3"></p>
          <h1 className="text-2xl font-black text-white">ParkControl</h1>
          <p className="text-gray-500 text-sm mt-1">Consulta tu puesto de parqueo</p>
        </div>

        <form onSubmit={buscar} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Placa del vehículo</label>
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
              Código de acceso <span className="normal-case text-gray-600">(últimos 4 dígitos de tu cédula)</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
              placeholder=""
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest placeholder-gray-700 focus:outline-none focus:border-green-500"
            />
          </div>

          {buscado && error && (
            <p className="text-red-400 text-sm text-center">No se encontró ningún puesto con esos datos.</p>
          )}

          <button type="submit"
            className="w-full py-3 rounded-xl bg-green-500 text-black font-bold text-base hover:bg-green-400 transition-colors mt-1"
          >
            Consultar
          </button>
        </form>

        <p className="text-[10px] text-gray-600 text-center">
          Si no recuerdas tu código, contacta al administrador.
        </p>

        {/* Disclaimer */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-[10px] text-gray-600 flex flex-col gap-1 leading-relaxed">
          <p className="text-gray-500 font-semibold text-xs mb-1"> Aviso de responsabilidad</p>
          <p>El parqueadero no se hace responsable por daños, pérdidas, hurtos o deterioro de los vehículos ni de los objetos dejados en su interior.</p>
          <p>Las cámaras de vigilancia son de uso exclusivo del propietario del parqueadero para fines de seguridad. Las imágenes son privadas y no serán compartidas con terceros salvo requerimiento legal.</p>
          <p>Al consultar este portal, el usuario acepta estos términos.</p>
        </div>
      </div>
    </div>
  );
}
