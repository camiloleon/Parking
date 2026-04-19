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
  cuotas: [],
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

// Intercambia los datos de cliente entre dos puestos (mantiene id y numero intactos)
const CAMPOS_CLIENTE = ['estado','nombre','cedula','placa','color','fechaInicio','token','camara','tipo','duracion','precio','pagado','fechaUltimoPago','historialPagos','cuotas'];
export function swapPuestos(idA, idB) {
  const puestos = getPuestos();
  const pA = puestos.find(p => p.id === idA);
  const pB = puestos.find(p => p.id === idB);
  if (!pA || !pB) return puestos;
  const snapshot = (p) => Object.fromEntries(CAMPOS_CLIENTE.map(k => [k, p[k]]));
  const datosA = snapshot(pA);
  const datosB = snapshot(pB);
  // Regenerar IDs de cuotas con el nuevo número de puesto
  function reIdCuotas(cuotas, nuevoId) {
    return (cuotas || []).map((c, i) => ({ ...c, id: `${nuevoId}-${i + 1}` }));
  }
  const nuevos = puestos.map(p => {
    if (p.id === idA) return { ...p, ...datosB, cuotas: reIdCuotas(datosB.cuotas, idA) };
    if (p.id === idB) return { ...p, ...datosA, cuotas: reIdCuotas(datosA.cuotas, idB) };
    return p;
  });
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

// ─── CUOTAS MENSUALES ────────────────────────────────────────────────────────

function _periodoLabel(year, month) {
  const fecha = new Date(year, month - 1, 1);
  const mes = fecha.toLocaleDateString('es-CO', { month: 'long' });
  return mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + year;
}

// Genera (o sincroniza) las cuotas mensuales de un puesto con duracion='mes'
// Retorna el array de cuotas actualizado. No muta el puesto directamente.
export function generarCuotasMensuales(puesto) {
  if (!puesto.fechaInicio || !puesto.nombre || puesto.duracion !== 'mes') {
    return puesto.cuotas || [];
  }

  const cuotasExistentes = puesto.cuotas || [];
  const existentesPorN   = Object.fromEntries(cuotasExistentes.map(c => [c.n, c]));

  const hoy   = new Date();
  hoy.setHours(23, 59, 59, 999);
  const inicio = new Date(puesto.fechaInicio + 'T00:00:00');

  const resultado = [];
  let n = 1;

  while (true) {
    // Inicio del período N = fechaInicio + (n-1) meses
    const periodoStart = new Date(inicio.getFullYear(), inicio.getMonth() + (n - 1), inicio.getDate());
    if (periodoStart > hoy) break;

    // Fecha de cobro = fechaInicio + n meses
    const fechaCobro = new Date(inicio.getFullYear(), inicio.getMonth() + n, inicio.getDate());
    const periodo    = `${periodoStart.getFullYear()}-${String(periodoStart.getMonth() + 1).padStart(2, '0')}`;
    const id         = `${puesto.id}-${n}`;

    if (existentesPorN[n]) {
      resultado.push(existentesPorN[n]);
    } else {
      resultado.push({
        id,
        n,
        periodo,
        label:            _periodoLabel(periodoStart.getFullYear(), periodoStart.getMonth() + 1),
        fechaVencimiento: fechaCobro.toISOString().slice(0, 10),
        monto:            puesto.precio,
        pagado:           false,
        fechaPago:        null,
      });
    }
    n++;
  }

  // Migración: si no había cuotas, restaurar desde historialPagos (por orden)
  if (cuotasExistentes.length === 0) {
    (puesto.historialPagos || []).forEach((pago, i) => {
      if (resultado[i] && !resultado[i].pagado) {
        resultado[i] = { ...resultado[i], pagado: true, fechaPago: pago.fecha, monto: pago.monto || resultado[i].monto };
      }
    });
    // Si el puesto tiene pagado=true pero sin historial, marcar la última cuota pagada
    if (puesto.pagado && resultado.length > 0) {
      const ultima = resultado[resultado.length - 1];
      if (!ultima.pagado) {
        resultado[resultado.length - 1] = { ...ultima, pagado: true, fechaPago: puesto.fechaUltimoPago || new Date().toISOString().slice(0, 10) };
      }
    }
  }

  return resultado;
}

// Retorna la cuota del período actual (mes en curso) o la última generada
export function getCuotaActual(puesto) {
  if (!puesto.cuotas || puesto.cuotas.length === 0) return null;
  const hoy     = new Date();
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  return puesto.cuotas.find(c => c.periodo === periodo) || puesto.cuotas[puesto.cuotas.length - 1];
}

// Registra el pago de una cuota específica
export function registrarPagoCuota(puestoId, cuotaId) {
  const hoy    = new Date().toISOString().slice(0, 10);
  const puestos = getPuestos();
  const nuevos  = puestos.map(p => {
    if (p.id !== puestoId) return p;
    const cuotas = (p.cuotas || []).map(c =>
      c.id === cuotaId ? { ...c, pagado: true, fechaPago: hoy } : c
    );
    // Derivar pagado: ¿está la cuota del período actual pagada?
    const cuotaActual  = getCuotaActual({ ...p, cuotas });
    const pagadoActual = cuotaActual ? cuotaActual.pagado : p.pagado;
    // fechaUltimoPago: la más reciente entre las cuotas pagadas
    const cuotasPagadas = cuotas.filter(c => c.pagado && c.fechaPago).sort((a, b) => b.fechaPago.localeCompare(a.fechaPago));
    const ultimaPagada  = cuotasPagadas[0];
    // historialPagos derivado de cuotas (para compatibilidad)
    const historialPagos = cuotas
      .filter(c => c.pagado && c.fechaPago)
      .map(c => ({ fecha: c.fechaPago, monto: c.monto, label: c.label }));
    return {
      ...p,
      cuotas,
      pagado:          pagadoActual,
      fechaUltimoPago: ultimaPagada?.fechaPago || p.fechaUltimoPago || '',
      historialPagos,
    };
  });
  savePuestos(nuevos);
  return nuevos;
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

// Registra pago general (marca todas las cuotas pendientes como pagadas)
export function registrarPago(id) {
  const hoy    = new Date().toISOString().slice(0, 10);
  const puestos = getPuestos();
  const nuevos  = puestos.map(p => {
    if (p.id !== id) return p;
    if (p.cuotas && p.cuotas.length > 0) {
      const cuotas = p.cuotas.map(c => !c.pagado ? { ...c, pagado: true, fechaPago: hoy } : c);
      const historialPagos = cuotas
        .filter(c => c.pagado && c.fechaPago)
        .map(c => ({ fecha: c.fechaPago, monto: c.monto, label: c.label }));
      return { ...p, cuotas, pagado: true, fechaUltimoPago: hoy, historialPagos };
    }
    // Puestos diarios (sin cuotas)
    const historial = [...(p.historialPagos || []), { fecha: hoy, monto: p.precio }];
    return { ...p, pagado: true, fechaUltimoPago: hoy, historialPagos: historial };
  });
  savePuestos(nuevos);
  return nuevos;
}

// Marca la cuota actual como pendiente de pago
export function marcarPendiente(id) {
  const puestos = getPuestos();
  const nuevos  = puestos.map(p => {
    if (p.id !== id) return p;
    if (p.cuotas && p.cuotas.length > 0) {
      const cuotas = [...p.cuotas];
      // Desmarcar la última cuota (período actual)
      const idx = cuotas.length - 1;
      cuotas[idx] = { ...cuotas[idx], pagado: false, fechaPago: null };
      const historialPagos = cuotas
        .filter(c => c.pagado && c.fechaPago)
        .map(c => ({ fecha: c.fechaPago, monto: c.monto, label: c.label }));
      return { ...p, cuotas, pagado: false, historialPagos };
    }
    return { ...p, pagado: false };
  });
  savePuestos(nuevos);
  return nuevos;
}

// Resumen financiero global
export function getResumenFinanciero() {
  const puestos = getPuestosActualizados();
  const ocupados = puestos.filter(p => p.estado !== 'libre');

  let totalEsperado = 0;  // cuota del período actual por puesto
  let cobradoMes    = 0;  // cuota actual ya pagada (para calcular pendiente del mes)
  let totalCobrado  = 0;  // TODAS las cuotas pagadas históricamente

  ocupados.forEach(p => {
    if (p.duracion === 'mes' && p.cuotas && p.cuotas.length > 0) {
      const cuotaActual = getCuotaActual(p);
      if (cuotaActual) {
        totalEsperado += cuotaActual.monto;
        if (cuotaActual.pagado) cobradoMes += cuotaActual.monto;
      }
      // Sumar TODAS las cuotas pagadas al total histórico
      totalCobrado += p.cuotas.filter(c => c.pagado).reduce((s, c) => s + (c.monto || 0), 0);
    } else {
      totalEsperado += p.precio || 0;
      if (p.pagado) {
        cobradoMes   += p.precio || 0;
        totalCobrado += p.precio || 0;
      }
    }
  });

  const totalPendiente = totalEsperado - cobradoMes;
  const pagadosCount   = ocupados.filter(p => {
    if (p.duracion === 'mes' && p.cuotas && p.cuotas.length > 0) {
      const ca = getCuotaActual(p);
      return ca ? ca.pagado : false;
    }
    return p.pagado;
  }).length;

  const morosos = puestos.filter(p => p.estado === 'mora');
  return { ocupados, totalEsperado, totalCobrado, cobradoMes, totalPendiente, pagadosCount, morosos };
}

// Retorna puestos con estados auto-actualizados (mora/libre según cuotas y fechas)
export function getPuestosActualizados() {
  const puestos = getPuestos();
  let changed   = false;
  const hoyStr  = new Date().toISOString().slice(0, 10);

  const actualizados = puestos.map(p => {
    let u = { ...p };

    // ── Auto-generar cuotas para puestos mensuales con cliente ──
    if (u.nombre && u.fechaInicio && u.duracion === 'mes') {
      const nuevasCuotas = generarCuotasMensuales(u);
      if (JSON.stringify(nuevasCuotas) !== JSON.stringify(u.cuotas || [])) {
        u = { ...u, cuotas: nuevasCuotas };
        changed = true;
      }
      // Derivar pagado desde la cuota actual
      const ca = getCuotaActual(u);
      const pagadoDerived = ca ? ca.pagado : u.pagado;
      if (pagadoDerived !== u.pagado) {
        u = { ...u, pagado: pagadoDerived };
        changed = true;
      }
    }

    // ── Estado libre / ocupado ──
    if (!u.nombre && !u.placa && u.estado !== 'libre') {
      changed = true;
      return { ...u, estado: 'libre', cuotas: [] };
    }
    if (u.nombre && u.placa && u.estado === 'libre') {
      changed = true;
      return { ...u, estado: 'ocupado' };
    }

    // ── Auto-mora: cuotas vencidas sin pagar ──
    if ((u.estado === 'ocupado' || u.estado === 'mora') && u.nombre) {
      if (u.duracion === 'mes' && u.cuotas && u.cuotas.length > 0) {
        const tieneMora = u.cuotas.some(c => !c.pagado && c.fechaVencimiento < hoyStr);
        if (tieneMora && u.estado === 'ocupado') {
          changed = true;
          u = { ...u, estado: 'mora' };
        } else if (!tieneMora && u.estado === 'mora') {
          changed = true;
          u = { ...u, estado: 'ocupado' };
        }
      } else {
        // Puestos diarios: lógica original
        if (u.estado === 'ocupado' && u.fechaInicio && !u.pagado) {
          const v = calcularVencimiento(u.fechaInicio, u.duracion, u.fechaUltimoPago || null);
          if (v && v.vencido) { changed = true; u = { ...u, estado: 'mora' }; }
        }
        if (u.estado === 'mora' && u.pagado) { changed = true; u = { ...u, estado: 'ocupado' }; }
      }
    }

    return u;
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
