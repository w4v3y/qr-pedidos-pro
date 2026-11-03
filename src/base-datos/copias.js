/**
 * Copias de seguridad automáticas de la base de datos.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { RUTAS, COPIAS_SEGURIDAD } = require('../config');
const log = require('../utilidades/registro');

function crearCopia() {
  try {
    if (!fs.existsSync(RUTAS.baseDatos)) return;
    fs.mkdirSync(RUTAS.copias, { recursive: true });
    const hoy = new Date().toISOString().slice(0, 10);
    const destino = path.join(RUTAS.copias, `restaurante-${hoy}.db`);
    if (fs.existsSync(destino)) return; // ya hay copia de hoy
    fs.copyFileSync(RUTAS.baseDatos, destino);
    log.info('Copia de seguridad creada', { archivo: path.basename(destino) });
    limpiarAntiguas();
  } catch (e) { log.error('No se pudo crear la copia de seguridad', e); }
}

function limpiarAntiguas() {
  const archivos = fs.readdirSync(RUTAS.copias)
    .filter(f => f.startsWith('restaurante-') && f.endsWith('.db')).sort().reverse();
  for (const viejo of archivos.slice(COPIAS_SEGURIDAD.conservar)) {
    fs.unlinkSync(path.join(RUTAS.copias, viejo));
    log.info('Copia antigua eliminada', { archivo: viejo });
  }
}

function programar() {
  crearCopia();
  const intervalo = setInterval(crearCopia, COPIAS_SEGURIDAD.cadaHoras * 3600 * 1000);
  intervalo.unref();
  return intervalo;
}
module.exports = { crearCopia, programar };
