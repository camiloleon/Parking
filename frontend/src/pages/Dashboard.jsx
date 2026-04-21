import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPuestosActualizados, updatePuesto, TARIFAS, logout } from "../store";

const COLORES = {
  libre:   "border-green-500 bg-green-950/40 text-green-400",
  ocupado: "border-blue-500 bg-blue-950/40 text-blue-300",
  mora:    "border-red-500 bg-red-950/40 text-red-400",
};

function fmt(n) {
  return "$" + Number(n).toLocaleString("es-CO");
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    getPuestosActualizados().then(p => { setPuestos(p); setCargando(false); });
  }, []);

  function abrir(p) {
    setEditando({ ...p });
  }

  function cambiarTipo(tipo) {
    setEditando(ed => ({ ...ed, tipo, precio: TARIFAS[tipo][ed.duracion] }));
  }

  function cambiarDuracion(duracion) {
    setEditando(ed => ({ ...ed, duracion, precio: TARIFAS[ed.tipo][duracion] }));
  }

  async function guardar() {
    // Estado automático: si tiene nombre+placa -> ocupado; si está vacío -> libre
    const tieneCliente = editando.nombre.trim() || editando.placa.trim();
    const estadoAuto = tieneCliente ? 'ocupado' : 'libre';

    await updatePuesto(editando.id, {
      estado:      estadoAuto,
      nombre:      editando.nombre,
      cedula:      editando.cedula,
      placa:       editando.placa.toUpperCase(),
      color:       editando.color,
      fechaInicio: editando.fechaInicio,
      camara:      editando.camara,
      tipo:        editando.tipo,
      duracion:    editando.duracion,
      precio:      Number(editando.precio),
      fechaUltimoPago: tieneCliente ? (editando.fechaUltimoPago || '') : '',
      // pagado = true solo si hay fecha de último pago
      pagado:      tieneCliente ? !!editando.fechaUltimoPago : false,
      historialPagos: tieneCliente ? editando.historialPagos : [],
    });
    const nuevos = await getPuestosActualizados();
    setPuestos(nuevos);
    setEditando(null);
  }

  function handleQR(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEditando(ed => ({ ...ed, camara: ev.target.result }));
    reader.readAsDataURL(file);
  }

  // Link de acceso del cliente — usa BASE_URL de Vite (funciona en dev y en /Parking/)
  const linkAcceso = `${window.location.origin}${import.meta.env.BASE_URL}#/acceso`;
  const [copiado, setCopiado] = useState(false);
  const [compartidoOk, setCompartidoOk] = useState(false);
  function copiarLink() {
    navigator.clipboard.writeText(linkAcceso).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto mb-6">
        <h1 className="text-xl font-bold text-white">
           ParkSanJoseph <span className="text-green-400">Admin</span>
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/finanzas")}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 font-semibold"
          >
             Finanzas
          </button>
          <button
            onClick={() => { logout(); window.location.reload(); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
        {cargando ? (
          <div className="col-span-4 text-center py-12 text-gray-500">Cargando puestos...</div>
        ) : puestos.map(p => (
          <button
            key={p.id}
            onClick={() => abrir(p)}
            className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all hover:scale-105 ${COLORES[p.estado]}`}
          >
            <span className="text-2xl font-black text-white">{String(p.numero).padStart(2,"0")}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest">{p.estado}</span>
            {p.nombre && <span className="text-[9px] text-gray-400 truncate w-full text-center">{p.nombre}</span>}
            {p.placa && <span className="text-[9px] text-gray-500 font-mono">{p.placa}</span>}
            {p.estado !== "libre" && (
              <span className="text-[9px] text-gray-500">{fmt(p.precio)}/{p.duracion}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-4 mt-6 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/> Libre</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/> Ocupado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"/> Mora</span>
      </div>

      {/* Modal edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4 my-4">
            <h2 className="text-white font-bold text-lg">Puesto {String(editando.numero).padStart(2,"0")}</h2>

            {/* Tipo de vehículo */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Tipo de vehículo</p>
              <div className="grid grid-cols-2 gap-2">
                {[["auto"," Automóvil"],["camioneta"," Camioneta"]].map(([val,label]) => (
                  <button key={val} onClick={() => cambiarTipo(val)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      editando.tipo === val ? "bg-indigo-500/20 border-indigo-400 text-indigo-300" : "border-gray-700 text-gray-600"
                    }`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Duración */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Duración</p>
              <div className="grid grid-cols-2 gap-2">
                {[["mes"," Por mes"],["dia"," Por día"]].map(([val,label]) => (
                  <button key={val} onClick={() => cambiarDuracion(val)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      editando.duracion === val ? "bg-yellow-500/20 border-yellow-400 text-yellow-300" : "border-gray-700 text-gray-600"
                    }`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Precio */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                Precio <span className="normal-case text-gray-600">(ajustable)</span>
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={editando.precio}
                  onChange={e => setEditando(ed => ({ ...ed, precio: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">
                Tarifa base: {fmt(TARIFAS[editando.tipo][editando.duracion])}/{editando.duracion}
              </p>
            </div>

            <input placeholder="Nombre del cliente" value={editando.nombre}
              onChange={e => setEditando(ed => ({ ...ed, nombre: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
            <input placeholder="Cédula" value={editando.cedula}
              onChange={e => setEditando(ed => ({ ...ed, cedula: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Placa (ej: ABC123)" value={editando.placa}
                onChange={e => setEditando(ed => ({ ...ed, placa: e.target.value.toUpperCase() }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 font-mono uppercase"
              />
              <input placeholder="Color / marca" value={editando.color}
                onChange={e => setEditando(ed => ({ ...ed, color: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Fecha inicio contrato</p>
              <input type="date" value={editando.fechaInicio}
                onChange={e => {
                  const fecha = e.target.value;
                  setEditando(ed => ({
                    ...ed,
                    fechaInicio: fecha,
                    // Si no hay pago registrado, el primer pago por adelantado es en la fecha de inicio
                    fechaUltimoPago: ed.fechaUltimoPago ? ed.fechaUltimoPago : fecha,
                    pagado: ed.fechaUltimoPago ? ed.pagado : !!fecha,
                  }));
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Gestión de pago */}
            {editando.nombre && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-3 flex flex-col gap-2">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Fecha en que recibiste el último pago</p>
                <div className="flex gap-2 items-center">
                  <input type="date" value={editando.fechaUltimoPago || ''}
                    onChange={e => setEditando(ed => ({
                      ...ed,
                      fechaUltimoPago: e.target.value,
                      pagado: !!e.target.value,
                    }))}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const hoy = new Date().toISOString().slice(0,10);
                      setEditando(ed => ({ ...ed, fechaUltimoPago: hoy, pagado: true }));
                    }}
                    className="text-xs px-2 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/40 font-semibold whitespace-nowrap"
                  >
                    Hoy
                  </button>
                </div>
                <p className="text-[10px] text-gray-600">⚠ Registra la fecha en que <strong>realmente recibiste</strong> el pago — no necesariamente hoy. Para pago inicial al arranque del contrato, usa la fecha de inicio.</p>
              </div>
            )}

            {/* QR de cámara */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">QR de cámara (imagen)</p>
              <label className="flex items-center gap-2 bg-gray-800 border border-dashed border-gray-600 rounded-lg px-3 py-2 cursor-pointer hover:border-green-500 transition-colors">
                <span className="text-gray-400 text-sm"> {editando.camara ? "Cambiar imagen QR" : "Subir imagen QR"}</span>
                <input type="file" accept="image/*" onChange={handleQR} className="hidden" />
              </label>
              {editando.camara && (
                <div className="mt-2 flex flex-col items-center gap-1">
                  <img src={editando.camara} alt="QR cámara" className="w-24 h-24 object-contain rounded-lg bg-white p-1" />
                  <button onClick={() => setEditando(ed => ({ ...ed, camara: '' }))}
                    className="text-[10px] text-red-400 hover:text-red-300"> Quitar QR</button>
                </div>
              )}
            </div>

            {/* Link de acceso para el cliente */}
            {editando.cedula && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-3 flex flex-col gap-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Link de acceso del cliente</p>
                <a href={linkAcceso} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-400 font-mono break-all underline underline-offset-2 hover:text-green-300 cursor-pointer">
                  {linkAcceso}
                </a>
                <div className="bg-gray-900 rounded-lg px-2 py-1.5 text-[11px] text-gray-400">
                  <span className="text-gray-600">Código: </span>
                  <span className="font-mono text-yellow-400 font-bold">{editando.cedula.replace(/\D/g,'').slice(-4) || '----'}</span>
                  <span className="text-gray-600"> (4 últimos dígitos cédula)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={copiarLink}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition-colors ${
                      copiado ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}>
                    {copiado ? '✅ ¡Copiado!' : '📋 Copiar link'}
                  </button>
                  <button onClick={() => {
                    const codigo = editando.cedula.replace(/\D/g,'').slice(-4);
                    const msg = [
                      `🅿️ *ParkSanJoseph — Puesto ${String(editando.numero).padStart(2,'0')}*`,
                      `\nHola ${editando.nombre},`,
                      `Ya puedes consultar tu puesto en:`,
                      `${linkAcceso}`,
                      `\n*Placa:* ${editando.placa}`,
                      `*Código de acceso:* ${codigo}`,
                      `\n_Si necesitas ayuda, contáctanos._`,
                    ].join('\n');
                    navigator.clipboard.writeText(msg).then(() => {
                      setCompartidoOk(true);
                      setTimeout(() => setCompartidoOk(false), 2500);
                    });
                  }}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition-colors ${
                      compartidoOk ? 'bg-green-500 text-black' : 'bg-green-700/40 text-green-300 hover:bg-green-700/60'
                    }`}>
                    {compartidoOk ? '✅ Listo!' : '📲 Copiar para WhatsApp'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEditando(null)} className="flex-1 py-2 rounded-xl text-sm bg-gray-800 text-gray-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={guardar} className="flex-1 py-2 rounded-xl text-sm bg-green-500 text-black font-bold hover:bg-green-400">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
