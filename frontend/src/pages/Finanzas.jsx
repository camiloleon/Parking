import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPuestos, getPuestosActualizados, getResumenFinanciero, registrarPago, marcarPendiente,
  calcularVencimiento, logout, cambiarPin, updatePuesto,
  getGastos, agregarGasto, eliminarGasto,
  getNovedades, marcarNovedadLeida,
} from "../store";

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("es-CO");
}

function Badge({ ok }) {
  return ok ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">Cobrado</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">Pendiente</span>
  );
}

export default function Finanzas() {
  const navigate = useNavigate();
  const [puestos, setPuestos] = useState([]);
  const [resumen, setResumen] = useState({ ocupados: [], totalEsperado: 0, totalCobrado: 0, totalPendiente: 0, pagadosCount: 0, morosos: [] });
  const [tab, setTab] = useState("resumen");
  const [gastos, setGastos] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { refrescar(); }, []);
  const [editPago, setEditPago] = useState(null); // { id, fechaUltimoPago }
  const [formGasto, setFormGasto] = useState({ fecha: new Date().toISOString().slice(0,10), categoria: 'servicio', descripcion: '', monto: '' });
  const [gOk, setGOk] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinNuevo, setPinNuevo] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinOk, setPinOk] = useState(false);

  async function refrescar() {
    setCargando(true);
    const [p, r, g, n] = await Promise.all([getPuestosActualizados(), getResumenFinanciero(), getGastos(), getNovedades()]);
    setPuestos(p); setResumen(r); setGastos(g); setNovedades(n);
    setCargando(false);
  }

  async function cobrar(id) {
    const hoy = new Date().toISOString().slice(0, 10);
    await updatePuesto(id, { pagado: true, fechaUltimoPago: hoy });
    refrescar();
  }

  async function desmarcar(id) {
    await updatePuesto(id, { pagado: false });
    refrescar();
  }

  async function guardarFechaPago(id, fecha) {
    if (!fecha) {
      await updatePuesto(id, { pagado: false, fechaUltimoPago: '' });
    } else {
      await updatePuesto(id, { pagado: true, fechaUltimoPago: fecha });
    }
    setEditPago(null);
    refrescar();
  }

  function salir() {
    logout();
    navigate("/");
  }

  async function guardarGasto(e) {
    e.preventDefault();
    if (!formGasto.descripcion.trim() || !formGasto.monto) return;
    await agregarGasto(formGasto);
    setFormGasto({ fecha: new Date().toISOString().slice(0,10), categoria: 'servicio', descripcion: '', monto: '' });
    setGOk(true);
    setTimeout(() => setGOk(false), 2000);
    refrescar();
  }

  async function borrarGasto(id) {
    await eliminarGasto(id);
    refrescar();
  }

  async function leerNovedad(id) {
    await marcarNovedadLeida(id);
    refrescar();
  }

  async function guardarPin(e) {
    e.preventDefault();
    if (pinNuevo.length < 4) { setPinError("Mínimo 4 dígitos"); return; }
    if (pinNuevo !== pinConfirm) { setPinError("Los PINs no coinciden"); return; }
    await cambiarPin(pinNuevo);
    setPinOk(true);
    setTimeout(() => { setShowPinModal(false); setPinNuevo(""); setPinConfirm(""); setPinOk(false); setPinError(""); }, 1500);
  }

  const { ocupados, totalEsperado, totalCobrado, totalPendiente, pagadosCount, morosos } = resumen;
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const utilidadNeta = totalCobrado - totalGastos;
  const novedadesNoLeidas = novedades.filter(n => !n.leida).length;

  const historialAll = puestos
    .flatMap(p => (p.historialPagos || []).map(h => ({ ...h, nombre: p.nombre, placa: p.placa, numero: p.numero })))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-10">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
          >
            ← Dashboard
          </button>
          <h1 className="text-lg font-bold text-white">Control Financiero</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPinModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
          >
            ⚙️ Cambiar PIN
          </button>
          <button
            onClick={salir}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/70"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Tarjeta label="Ingresos esperados" valor={fmt(totalEsperado)} color="text-white" />
          <Tarjeta label="Recaudado" valor={fmt(totalCobrado)} color="text-green-400" />
          <Tarjeta label="Gastos" valor={fmt(totalGastos)} color="text-red-400" />
          <Tarjeta label="Utilidad neta" valor={fmt(utilidadNeta)} color={utilidadNeta >= 0 ? "text-green-400" : "text-red-400"} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <Tarjeta label="Pendiente por cobrar" valor={fmt(totalPendiente)} color="text-yellow-400" />
          <Tarjeta label="Puestos en mora" valor={morosos.length} color={morosos.length > 0 ? "text-red-400" : "text-gray-400"} />
          <Tarjeta label="Novedades sin leer" valor={novedadesNoLeidas} color={novedadesNoLeidas > 0 ? "text-yellow-400" : "text-gray-400"} />
        </div>

        {/* Barra de progreso recaudo */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progreso de recaudo — {ocupados.length > 0 ? Math.round((pagadosCount / ocupados.length) * 100) : 0}%</span>
            <span>{pagadosCount} / {ocupados.length} puestos cobrados</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: ocupados.length > 0 ? `${(pagadosCount / ocupados.length) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-wrap">
          {["resumen", "puestos", "historial", "gastos", "novedades"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors relative ${
                tab === t ? "bg-green-500 text-black font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              {t === "resumen" ? "Mora / Alertas"
                : t === "puestos" ? "Puestos"
                : t === "historial" ? "Historial pagos"
                : t === "gastos" ? "Gastos"
                : "Novedades"}
              {t === "novedades" && novedadesNoLeidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {novedadesNoLeidas}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Mora / Alertas */}
        {tab === "resumen" && (
          <div className="space-y-2">
            {morosos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">✅ Sin puestos en mora</p>
            ) : morosos.map(p => {
              const v = calcularVencimiento(p.fechaInicio, p.duracion, false, null);
              return (
                <div key={p.id} className="bg-red-950/30 border border-red-800/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-300">Puesto {p.numero} — {p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.placa} · {fmt(p.precio)}</p>
                    {v && <p className="text-xs text-red-400 mt-0.5">⚠ {v.diasMora} {v.diasMora === 1 ? 'día' : 'días'} en mora — venció el {v.anclaActual.toLocaleDateString('es-CO', {day:'2-digit',month:'long'})}</p>}
                  </div>
                  <button
                    onClick={() => setEditPago({ id: p.id, fechaUltimoPago: p.fechaUltimoPago || '' })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 font-semibold shrink-0"
                  >
                    Registrar pago
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Puestos */}
        {tab === "puestos" && (
          <div className="space-y-2">
            {ocupados.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No hay puestos ocupados</p>
            )}
            {ocupados.map(p => {
              const v = calcularVencimiento(p.fechaInicio, p.duracion, p.pagado, p.fechaUltimoPago || null);
              const editando = editPago?.id === p.id;
              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">#{p.numero}</span>
                        <span className="text-sm text-gray-200 truncate">{p.nombre || "—"}</span>
                        <Badge ok={p.pagado} />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                        <span>{p.placa || "—"}</span>
                        <span>{p.tipo} · {p.duracion}</span>
                        <span className="text-green-400 font-mono">{fmt(p.precio)}</span>
                        {v && (
                          <span className={!p.pagado && v.diasMora > 0 ? "text-red-400" : v.diasRestantes <= 5 ? "text-yellow-400" : "text-gray-400"}>
                            {!p.pagado && v.diasMora > 0
                              ? `⚠ ${v.diasMora}d mora (venció el ${v.anclaActual.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit'})})`
                              : `Próx. pago: ${v.fechaPago.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit'})} (${v.diasRestantes}d)`
                            }
                          </span>
                        )}
                      </div>
                      {p.fechaUltimoPago && (
                        <p className="text-xs text-gray-500 mt-0.5">Último pago recibido: {p.fechaUltimoPago}{v?.diasTarde > 0 ? ` (⚠ ${v.diasTarde}d tarde)` : ''}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditPago(editando ? null : { id: p.id, fechaUltimoPago: p.fechaUltimoPago || '' })}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 font-semibold shrink-0"
                    >
                      {editando ? 'Cerrar' : '🗓 Editar pago'}
                    </button>
                  </div>

                  {/* Editor inline de fecha de pago */}
                  {editando && (
                    <div className="bg-gray-800 rounded-xl p-3 flex flex-col gap-2 border border-gray-700">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Editar fecha de último pago</p>
                      <p className="text-[10px] text-gray-600">Ancla ciclo: {v?.anclaActual.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})}</p>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={editPago.fechaUltimoPago}
                          onChange={e => setEditPago(ep => ({ ...ep, fechaUltimoPago: e.target.value }))}
                          className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                        />
                        <button
                          onClick={() => setEditPago(ep => ({ ...ep, fechaUltimoPago: new Date().toISOString().slice(0,10) }))}
                          className="text-xs px-2 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/40 font-semibold"
                        >Hoy</button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => guardarFechaPago(p.id, editPago.fechaUltimoPago)}
                          className="flex-1 py-1.5 rounded-lg bg-green-500 text-black font-bold text-xs hover:bg-green-400"
                        >✓ Guardar pago</button>
                        <button
                          onClick={() => guardarFechaPago(p.id, '')}
                          className="flex-1 py-1.5 rounded-lg bg-red-500/20 text-red-400 font-semibold text-xs hover:bg-red-500/40"
                        >✕ Quitar pago</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Historial */}
        {tab === "historial" && (
          <div className="space-y-2">
            {historialAll.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin pagos registrados aún</p>
            ) : (
              historialAll.map((h, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Puesto #{h.numero} — {h.nombre}</p>
                    <p className="text-xs text-gray-400">{h.placa} · {h.fecha}</p>
                  </div>
                  <span className="text-green-400 font-mono font-bold text-sm">{fmt(h.monto)}</span>
                </div>
              ))
            )}
            {historialAll.length > 0 && (
              <div className="border-t border-gray-800 pt-3 flex justify-between text-sm">
                <span className="text-gray-400">Total histórico recaudado:</span>
                <span className="text-green-400 font-mono font-bold">
                  {fmt(historialAll.reduce((s, h) => s + (h.monto || 0), 0))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab: Gastos */}
        {tab === "gastos" && (
          <div className="space-y-4">
            {/* Formulario nuevo gasto */}
            <form onSubmit={guardarGasto} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Registrar gasto</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Fecha</p>
                  <input
                    type="date"
                    value={formGasto.fecha}
                    onChange={e => setFormGasto(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Categoría</p>
                  <select
                    value={formGasto.categoria}
                    onChange={e => setFormGasto(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="servicio">Servicios</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="nomina">Nómina</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
              <input
                placeholder="Descripción"
                value={formGasto.descripcion}
                onChange={e => setFormGasto(f => ({ ...f, descripcion: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
              />
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Monto"
                  value={formGasto.monto}
                  onChange={e => setFormGasto(f => ({ ...f, monto: e.target.value }))}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-red-500/80 text-white font-bold text-sm hover:bg-red-500">
                  + Agregar
                </button>
              </div>
              {gOk && <p className="text-green-400 text-xs">✅ Gasto registrado</p>}
            </form>

            {/* Lista gastos */}
            {gastos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Sin gastos registrados</p>
            ) : (
              <>
                {gastos.map(g => (
                  <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">{g.categoria}</span>
                        <span className="text-sm text-white truncate">{g.descripcion}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{g.fecha}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-red-400 font-mono font-bold text-sm">{fmt(g.monto)}</span>
                      <button onClick={() => borrarGasto(g.id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-800 pt-3 flex justify-between text-sm">
                  <span className="text-gray-400">Total gastos:</span>
                  <span className="text-red-400 font-mono font-bold">{fmt(totalGastos)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Recaudado:</span>
                  <span className="text-green-400 font-mono font-bold">{fmt(totalCobrado)}</span>
                </div>
                <div className={`flex justify-between text-base font-bold border-t border-gray-700 pt-3 ${utilidadNeta >= 0 ? "text-green-400" : "text-red-400"}`}>
                  <span>Utilidad neta:</span>
                  <span className="font-mono">{fmt(utilidadNeta)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Novedades */}
        {tab === "novedades" && (
          <div className="space-y-2">
            {novedades.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin novedades reportadas</p>
            ) : novedades.map(n => (
              <div
                key={n.id}
                className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${
                  n.leida ? "bg-gray-900 border-gray-800" : "bg-yellow-950/20 border-yellow-700/40"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      n.tipo === "dano" ? "bg-orange-500/20 text-orange-400"
                      : n.tipo === "robo" ? "bg-red-500/20 text-red-400"
                      : "bg-gray-700 text-gray-400"
                    }`}>
                      {n.tipo === "dano" ? "🔧 Daño" : n.tipo === "robo" ? "🚨 Robo/Hurto" : "💬 Otro"}
                    </span>
                    <span className="text-xs text-gray-500">Puesto {n.puesto} · {n.placa}</span>
                    <span className="text-xs text-gray-600">{n.fecha} {n.hora}</span>
                  </div>
                  <p className="text-sm text-gray-200">{n.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.nombre}</p>
                </div>
                {!n.leida && (
                  <button
                    onClick={() => leerNovedad(n.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 shrink-0"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal cambiar PIN */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <form
            onSubmit={guardarPin}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-xs flex flex-col gap-4"
          >
            <h2 className="text-lg font-bold text-white text-center">Cambiar PIN</h2>
            <input
              type="password"
              inputMode="numeric"
              placeholder="Nuevo PIN"
              value={pinNuevo}
              onChange={e => setPinNuevo(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-green-500"
            />
            <input
              type="password"
              inputMode="numeric"
              placeholder="Confirmar PIN"
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-green-500"
            />
            {pinError && <p className="text-red-400 text-xs text-center">{pinError}</p>}
            {pinOk && <p className="text-green-400 text-xs text-center">✅ PIN actualizado</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-400">Cancelar</button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-green-500 text-black font-bold">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Tarjeta({ label, valor, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{valor}</p>
    </div>
  );
}
