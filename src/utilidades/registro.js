/**
 * Registro (logs) a consola y archivo, con niveles y rotación simple.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { RUTAS, REGISTRO } = require('../config');

const NIVELES = { debug: 10, info: 20, aviso: 30, error: 40 };
const nivelMinimo = NIVELES[REGISTRO.nivel] || NIVELES.info;

function asegurarCarpeta() {
  fs.mkdirSync(path.dirname(RUTAS.registro), { recursive: true });
}
function rotarSiHaceFalta() {
  try {
    const st = fs.statSync(RUTAS.registro);
    if (st.size > REGISTRO.maxArchivoBytes) fs.renameSync(RUTAS.registro, RUTAS.registro + '.1');
  } catch (_) { /* aún no existe */ }
}
function escribir(nivel, mensaje, extra) {
  if (NIVELES[nivel] < nivelMinimo) return;
  const linea = `[${new Date().toISOString()}] [${nivel.toUpperCase()}] ${mensaje}` +
    (extra ? ' ' + JSON.stringify(extra) : '');
  if (nivel === 'error') console.error(linea); else console.log(linea);
  try {
    asegurarCarpeta(); rotarSiHaceFalta();
    fs.appendFileSync(RUTAS.registro, linea + '\n');
  } catch (_) { /* si falla el disco, no tumbamos el servidor */ }
}

module.exports = {
  debug: (m, e) => escribir('debug', m, e),
  info:  (m, e) => escribir('info', m, e),
  aviso: (m, e) => escribir('aviso', m, e),
  error: (m, e) => escribir('error', m, e instanceof Error ? { mensaje: e.message, stack: e.stack } : e),
};
