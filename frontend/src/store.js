// Tarifas base (el admin puede sobrescribir por puesto)
export const TARIFAS = {
  auto:      { mes: 70000, dia: 10000 },
  camioneta: { mes: 80000, dia: 12000 },
};

// ─── AUTH ────────────────────────────────────────────────────────────────────
const AUTH_KEY   = 'parkcontrol_auth';
const CONFIG_KEY = 'parkcontrol_config';

export function getConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : { pin: '1234' };
  } catch { return { pin: '1234' }; }
}

export function verificarPin(pin) {
  return pin === getConfig().pin;
}

export function cambiarPin(pinNuevo) {
  const cfg = getConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...cfg, pin: pinNuevo }));
}

export function isAutenticado() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

export function login(pin) {
  if (!verificarPin(pin)) return false;
  sessionStorage.setItem(AUTH_KEY, '1');
  return true;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

// ─── NOVEDADES (reportes de clientes) ─────────────────────────────────────────
const NOV_KEY = 'parkcontrol_novedades';

export function getNovedades() {
  try { return JSON.parse(localStorage.getItem(NOV_KEY) || '[]'); } catch { return []; }
}

export function reportarNovedad(novedad) {
  const lista = getNovedades();
  const nueva = {
    id: Date.now(),
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    puesto: novedad.puesto,
    placa: novedad.placa,
    nombre: novedad.nombre,
    tipo: novedad.tipo,        // 'dano' | 'robo' | 'otro'
    descripcion: novedad.descripcion,
    leida: false,
  };
  localStorage.setItem(NOV_KEY, JSON.stringify([nueva, ...lista]));
}

export function marcarNovedadLeida(id) {
  const lista = getNovedades().map(n => n.id === id ? { ...n, leida: true } : n);
  localStorage.setItem(NOV_KEY, JSON.stringify(lista));
}

// ─── GASTOS ────────────────────────────────────────────────────────────────────
const GASTOS_KEY = 'parkcontrol_gastos';

export function getGastos() {
  try { return JSON.parse(localStorage.getItem(GASTOS_KEY) || '[]'); } catch { return []; }
}

export function agregarGasto(gasto) {
  const lista = getGastos();
  const nuevo = {
    id: Date.now(),
    fecha: gasto.fecha || new Date().toISOString().slice(0, 10),
    categoria: gasto.categoria,   // 'servicio' | 'mantenimiento' | 'nomina' | 'otro'
    descripcion: gasto.descripcion,
    monto: Number(gasto.monto),
  };
  const ordenado = [nuevo, ...lista].sort((a, b) => b.fecha.localeCompare(a.fecha));
  localStorage.setItem(GASTOS_KEY, JSON.stringify(ordenado));
}

export function eliminarGasto(id) {
  const lista = getGastos().filter(g => g.id !== id);
  localStorage.setItem(GASTOS_KEY, JSON.stringify(lista));
}

// ─── DATOS ────────────────────────────────────────────────────────────────────
// Estado inicial: 20 puestos vacíos
const INICIAL = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  numero: i + 1,
  estado: 'libre',
  nombre: '',
  cedula: '',
  placa: '',
  color: '',
  fechaInicio: '',
  token: '',
  camara: '',
  tipo: 'auto',
  duracion: 'mes',
  precio: 70000,
  pagado: false,
  fechaUltimoPago: '',
  historialPagos: [],
}));

const KEY = 'parkcontrol_puestos';

export function getPuestos() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : INICIAL;
  } catch {
    return INICIAL;
  }
}

export function savePuestos(puestos) {
  localStorage.setItem(KEY, JSON.stringify(puestos));
}

export function updatePuesto(id, cambios) {
  const puestos = getPuestos();
  const nuevos = puestos.map(p => p.id === id ? { ...p, ...cambios } : p);
  savePuestos(nuevos);
  return nuevos;
}

// Genera un token mnemónico legible desde nombre + cédula + placa
// Ej: JUPE-ABC-4567  (primeras 2 del nombre + 2 del apellido si hay + 3 de placa + 4 últimos cédula)
export function generarToken(nombre, cedula, placa) {
  const palabras = nombre.trim().toUpperCase().split(/\s+/);
  const n1 = (palabras[0] || '').slice(0, 3);
  const n2 = (palabras[1] || '').slice(0, 3);
  const p  = (placa || '').replace(/\s/g, '').toUpperCase().slice(-4);
  const c  = (cedula || '').replace(/\D/g, '').slice(-4);
  const partes = [n1, n2, p, c].filter(Boolean);
  return partes.join('-');
}

// Busca por placa + últimos 4 dígitos de cédula (login cliente)
export function buscarPorPlacaYCodigo(placa, codigo) {
  const puestos = getPuestosActualizados();
  return puestos.find(p =>
    p.placa && p.placa.toUpperCase() === placa.toUpperCase().trim() &&
    p.cedula && p.cedula.replace(/\D/g, '').slice(-4) === codigo.trim()
  ) ?? null;
}

// compat: buscar solo por placa (legacy)
export function buscarPorPlaca(placa) {
  return getPuestosActualizados().find(p => p.placa && p.placa.toUpperCase() === placa.toUpperCase().trim()) ?? null;
}

// Registra un pago para un puesto
export function registrarPago(id) {
  const hoy = new Date().toISOString().slice(0, 10);
  const puestos = getPuestos();
  const nuevos = puestos.map(p => {
    if (p.id !== id) return p;
    const historial = [...(p.historialPagos || []), { fecha: hoy, monto: p.precio }];
    return { ...p, pagado: true, fechaUltimoPago: hoy, historialPagos: historial };
  });
  savePuestos(nuevos);
  return nuevos;
}

// Marca un puesto como pendiente de pago (deuda)
export function marcarPendiente(id) {
  const nuevos = getPuestos().map(p => p.id === id ? { ...p, pagado: false } : p);
  savePuestos(nuevos);
  return nuevos;
}

// Resumen financiero global
export function getResumenFinanciero() {
  const puestos = getPuestosActualizados();
  const ocupados = puestos.filter(p => p.estado === 'ocupado');
  const totalEsperado = ocupados.reduce((s, p) => s + (p.precio || 0), 0);
  const totalCobrado  = ocupados.filter(p => p.pagado).reduce((s, p) => s + (p.precio || 0), 0);
  const totalPendiente = totalEsperado - totalCobrado;
  const pagadosCount   = ocupados.filter(p => p.pagado).length;
  const morosos = ocupados.filter(p => {
    if (p.pagado) return false;
    const v = calcularVencimiento(p.fechaInicio, p.duracion, p.fechaUltimoPago || null);
    return v && v.vencido;
  });
  return { ocupados, totalEsperado, totalCobrado, totalPendiente, pagadosCount, morosos };
}

// Retorna puestos con estados auto-actualizados (mora/libre según fechas y pagos)
export function getPuestosActualizados() {
  const puestos = getPuestos();
  let changed = false;
  const actualizados = puestos.map(p => {
    // Libre si no tiene nombre/placa
    if (!p.nombre && !p.placa && p.estado !== 'libre') {
      changed = true;
      return { ...p, estado: 'libre' };
    }
    // Si tiene datos y está libre, pasa a ocupado
    if (p.nombre && p.placa && p.estado === 'libre') {
      changed = true;
      return { ...p, estado: 'ocupado' };
    }
    // Auto-mora: si ocupado, no pagado y fecha vencida
    if (p.estado === 'ocupado' && p.fechaInicio && !p.pagado) {
      const v = calcularVencimiento(p.fechaInicio, p.duracion, p.fechaUltimoPago || null);
      if (v && v.vencido) {
        changed = true;
        return { ...p, estado: 'mora' };
      }
    }
    // Salir de mora si ya pagó
    if (p.estado === 'mora' && p.pagado) {
      changed = true;
      return { ...p, estado: 'ocupado' };
    }
    return p;
  });
  if (changed) savePuestos(actualizados);
  return actualizados;
}

// Calcula la próxima fecha de pago y días restantes
// Base: si hay fechaUltimoPago se cuenta desde ahí, si no desde fechaInicio (primer mes)
// Retorna { fechaPago: Date, diasRestantes: number, vencido: boolean }
export function calcularVencimiento(fechaInicio, duracion, fechaUltimoPago = null) {
  if (!fechaInicio) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // La base es el último pago o el inicio del contrato
  const baseStr = fechaUltimoPago || fechaInicio;
  const base = new Date(baseStr + 'T00:00:00');

  let fechaPago;
  if (duracion === 'mes') {
    fechaPago = new Date(base);
    fechaPago.setMonth(fechaPago.getMonth() + 1);
  } else {
    fechaPago = new Date(base);
    fechaPago.setDate(fechaPago.getDate() + 1);
  }

  const diff = Math.round((fechaPago - hoy) / (1000 * 60 * 60 * 24));
  return {
    fechaPago,
    diasRestantes: diff,
    vencido: diff < 0,
  };
}
