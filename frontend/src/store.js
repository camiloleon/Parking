import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  addDoc, deleteDoc, query, orderBy, writeBatch
} from 'firebase/firestore';

// ─── MIGRACIÓN DESDE localStorage ────────────────────────────────────────────
// Llama esta función una vez desde el celular donde están los datos viejos.
// Lee las claves viejas de localStorage y las sube a Firestore si Firestore está vacío.
export async function migrarDesdeLocalStorage() {
  try {
    // Verificar si Firestore ya tiene puestos
    const snap = await getDocs(collection(db, 'puestos'));
    if (!snap.empty) return { ok: false, msg: 'Firebase ya tiene datos. No se sobrescribió.' };

    // Leer datos viejos
    const puestosRaw = localStorage.getItem('parkcontrol_puestos');
    if (!puestosRaw) return { ok: false, msg: 'No se encontraron datos en este dispositivo.' };

    const puestos = JSON.parse(puestosRaw);
    const batch = writeBatch(db);
    puestos.forEach(p => {
      batch.set(doc(db, 'puestos', String(p.id)), p);
    });
    await batch.commit();

    // Migrar config/PIN
    const cfgRaw = localStorage.getItem('parkcontrol_config');
    if (cfgRaw) {
      await setDoc(doc(db, 'config', 'main'), JSON.parse(cfgRaw));
    }

    // Migrar novedades
    const novRaw = localStorage.getItem('parkcontrol_novedades');
    if (novRaw) {
      const novedades = JSON.parse(novRaw);
      for (const n of novedades) {
        await addDoc(collection(db, 'novedades'), n);
      }
    }

    // Migrar gastos
    const gasRaw = localStorage.getItem('parkcontrol_gastos');
    if (gasRaw) {
      const gastos = JSON.parse(gasRaw);
      for (const g of gastos) {
        await addDoc(collection(db, 'gastos'), g);
      }
    }

    return { ok: true, msg: `✅ ${puestos.length} puestos migrados a Firebase correctamente.` };
  } catch (e) {
    return { ok: false, msg: 'Error: ' + e.message };
  }
}

// Tarifas base (el admin puede sobrescribir por puesto)
export const TARIFAS = {
  auto:      { mes: 70000, dia: 10000 },
  camioneta: { mes: 80000, dia: 12000 },
};

// ─── AUTH (local, por sesión) ────────────────────────────────────────────────
const AUTH_KEY = 'psj_auth';

export async function getConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'main'));
    return snap.exists() ? snap.data() : { pin: '1234' };
  } catch { return { pin: '1234' }; }
}

export async function verificarPin(pin) {
  const cfg = await getConfig();
  return pin === cfg.pin;
}

export async function cambiarPin(pinNuevo) {
  const cfg = await getConfig();
  await setDoc(doc(db, 'config', 'main'), { ...cfg, pin: pinNuevo });
}

export function isAutenticado() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

export async function login(pin) {
  if (!(await verificarPin(pin))) return false;
  sessionStorage.setItem(AUTH_KEY, '1');
  return true;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

// ─── NOVEDADES ────────────────────────────────────────────────────────────────
export async function getNovedades() {
  try {
    const q = query(collection(db, 'novedades'), orderBy('fecha', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch { return []; }
}

export async function reportarNovedad(novedad) {
  const nueva = {
    id: Date.now(),
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    puesto: novedad.puesto,
    placa: novedad.placa,
    nombre: novedad.nombre,
    tipo: novedad.tipo,
    descripcion: novedad.descripcion,
    leida: false,
  };
  await addDoc(collection(db, 'novedades'), nueva);
}

export async function marcarNovedadLeida(id) {
  const snap = await getDocs(collection(db, 'novedades'));
  const docRef = snap.docs.find(d => d.data().id === id);
  if (docRef) await updateDoc(docRef.ref, { leida: true });
}

// ─── GASTOS ──────────────────────────────────────────────────────────────────
export async function getGastos() {
  try {
    const q = query(collection(db, 'gastos'), orderBy('fecha', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch { return []; }
}

export async function agregarGasto(gasto) {
  const nuevo = {
    id: Date.now(),
    fecha: gasto.fecha || new Date().toISOString().slice(0, 10),
    categoria: gasto.categoria,
    descripcion: gasto.descripcion,
    monto: Number(gasto.monto),
  };
  await addDoc(collection(db, 'gastos'), nuevo);
}

export async function eliminarGasto(id) {
  const snap = await getDocs(collection(db, 'gastos'));
  const docRef = snap.docs.find(d => d.data().id === id);
  if (docRef) await deleteDoc(docRef.ref);
}

// ─── PUESTOS ─────────────────────────────────────────────────────────────────
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

export async function getPuestos() {
  try {
    const snap = await getDocs(collection(db, 'puestos'));
    if (snap.empty) {
      // Primera vez: inicializar los 20 puestos en Firestore
      const batch = writeBatch(db);
      INICIAL.forEach(p => {
        batch.set(doc(db, 'puestos', String(p.id)), p);
      });
      await batch.commit();
      return INICIAL;
    }
    // Ordenar por id numérico
    const puestos = snap.docs.map(d => d.data());
    puestos.sort((a, b) => a.id - b.id);
    return puestos;
  } catch {
    return INICIAL;
  }
}

export async function updatePuesto(id, cambios) {
  await updateDoc(doc(db, 'puestos', String(id)), cambios);
}

export async function registrarPago(id) {
  const hoy = new Date().toISOString().slice(0, 10);
  const snap = await getDoc(doc(db, 'puestos', String(id)));
  if (!snap.exists()) return;
  const p = snap.data();
  const historial = [...(p.historialPagos || []), { fecha: hoy, monto: p.precio }];
  await updateDoc(doc(db, 'puestos', String(id)), { pagado: true, fechaUltimoPago: hoy, historialPagos: historial });
}

export async function marcarPendiente(id) {
  await updateDoc(doc(db, 'puestos', String(id)), { pagado: false });
}

// Retorna puestos con estados auto-actualizados
export async function getPuestosActualizados() {
  const puestos = await getPuestos();
  const updates = [];
  const actualizados = puestos.map(p => {
    if (!p.nombre && !p.placa && p.estado !== 'libre') {
      updates.push({ id: p.id, cambios: { estado: 'libre' } });
      return { ...p, estado: 'libre' };
    }
    if (p.nombre && p.placa && p.estado === 'libre') {
      updates.push({ id: p.id, cambios: { estado: 'ocupado' } });
      return { ...p, estado: 'ocupado' };
    }
    if ((p.estado === 'ocupado' || p.estado === 'mora') && p.pagado && p.fechaInicio) {
      const v = calcularVencimiento(p.fechaInicio, p.duracion, true, p.fechaUltimoPago || null);
      if (v && p.fechaUltimoPago) {
        const ultimoPago = new Date(p.fechaUltimoPago + 'T00:00:00');
        if (ultimoPago < v.anclaActual) {
          updates.push({ id: p.id, cambios: { pagado: false, estado: 'mora' } });
          return { ...p, pagado: false, estado: 'mora' };
        }
      } else if (v && !p.fechaUltimoPago) {
        updates.push({ id: p.id, cambios: { pagado: false } });
        return { ...p, pagado: false };
      }
    }
    if (p.estado === 'ocupado' && p.fechaInicio && !p.pagado) {
      const v = calcularVencimiento(p.fechaInicio, p.duracion, false, null);
      if (v && v.diasMora > 0) {
        updates.push({ id: p.id, cambios: { estado: 'mora' } });
        return { ...p, estado: 'mora' };
      }
    }
    if (p.estado === 'mora' && p.pagado) {
      updates.push({ id: p.id, cambios: { estado: 'ocupado' } });
      return { ...p, estado: 'ocupado' };
    }
    return p;
  });
  // Guardar cambios en Firestore en paralelo
  if (updates.length > 0) {
    await Promise.all(updates.map(u => updateDoc(doc(db, 'puestos', String(u.id)), u.cambios)));
  }
  return actualizados;
}

export async function getResumenFinanciero() {
  const puestos = await getPuestosActualizados();
  const ocupados = puestos.filter(p => p.estado === 'ocupado' || p.estado === 'mora');
  const totalEsperado  = ocupados.reduce((s, p) => s + (p.precio || 0), 0);
  const totalCobrado   = ocupados.filter(p => p.pagado).reduce((s, p) => s + (p.precio || 0), 0);
  const totalPendiente = totalEsperado - totalCobrado;
  const pagadosCount   = ocupados.filter(p => p.pagado).length;
  const morosos = ocupados.filter(p => {
    if (p.pagado) return false;
    const v = calcularVencimiento(p.fechaInicio, p.duracion, false, null);
    return v && v.diasMora > 0;
  });
  return { ocupados, totalEsperado, totalCobrado, totalPendiente, pagadosCount, morosos };
}

export async function buscarPorPlacaYCodigo(placa, codigo) {
  const puestos = await getPuestosActualizados();
  return puestos.find(p =>
    p.placa && p.placa.toUpperCase() === placa.toUpperCase().trim() &&
    p.cedula && p.cedula.replace(/\D/g, '').slice(-4) === codigo.trim()
  ) ?? null;
}

export function generarToken(nombre, cedula, placa) {
  const palabras = nombre.trim().toUpperCase().split(/\s+/);
  const n1 = (palabras[0] || '').slice(0, 3);
  const n2 = (palabras[1] || '').slice(0, 3);
  const p  = (placa || '').replace(/\s/g, '').toUpperCase().slice(-4);
  const c  = (cedula || '').replace(/\D/g, '').slice(-4);
  const partes = [n1, n2, p, c].filter(Boolean);
  return partes.join('-');
}

export function calcularVencimiento(fechaInicio, duracion, pagado = false, fechaUltimoPago = null) {
  if (!fechaInicio) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fechaInicio + 'T00:00:00');
  if (duracion === 'mes') {
    const diaAncla = inicio.getDate();
    let anclaActual = new Date(hoy.getFullYear(), hoy.getMonth(), diaAncla);
    if (anclaActual > hoy) {
      anclaActual = new Date(hoy.getFullYear(), hoy.getMonth() - 1, diaAncla);
    }
    if (anclaActual < inicio) anclaActual = new Date(inicio);
    const siguienteAncla = new Date(anclaActual);
    siguienteAncla.setMonth(siguienteAncla.getMonth() + 1);
    const diasMora = !pagado ? Math.max(0, Math.round((hoy - anclaActual) / 86400000)) : 0;
    let diasTarde = 0;
    if (pagado && fechaUltimoPago) {
      const fp = new Date(fechaUltimoPago + 'T00:00:00');
      diasTarde = Math.max(0, Math.round((fp - anclaActual) / 86400000));
    }
    const diasRestantes = Math.round((siguienteAncla - hoy) / 86400000);
    return { anclaActual, fechaPago: siguienteAncla, diasMora, diasTarde, diasRestantes, vencido: diasMora > 0 };
  } else {
    const base = (pagado && fechaUltimoPago)
      ? new Date(fechaUltimoPago + 'T00:00:00')
      : new Date(fechaInicio + 'T00:00:00');
    const vence = new Date(base);
    vence.setDate(vence.getDate() + 1);
    const diff = Math.round((vence - hoy) / 86400000);
    return {
      anclaActual: base,
      fechaPago: vence,
      diasMora: !pagado && diff < 0 ? Math.abs(diff) : 0,
      diasTarde: 0,
      diasRestantes: diff,
      vencido: !pagado && diff < 0,
    };
  }
}
