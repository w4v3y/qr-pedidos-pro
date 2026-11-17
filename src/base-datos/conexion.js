/**
 * Conexión única (singleton) a SQLite. Nadie más abre la base de datos.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { RUTAS } = require('../config');
const log = require('../utilidades/registro');

fs.mkdirSync(path.dirname(RUTAS.baseDatos), { recursive: true });

const db = new DatabaseSync(RUTAS.baseDatos);
db.exec('PRAGMA journal_mode = WAL;');   // permite leer mientras se escribe
db.exec('PRAGMA foreign_keys = ON;');    // integridad referencial
db.exec('PRAGMA busy_timeout = 5000;');  // espera en vez de fallar si está ocupada

/** Ejecuta varias operaciones como una sola transacción atómica. */
function enTransaccion(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
}

function cerrar() {
  try { db.close(); log.info('Base de datos cerrada correctamente'); }
  catch (e) { log.error('Error al cerrar la base de datos', e); }
}

module.exports = { db, enTransaccion, cerrar };
