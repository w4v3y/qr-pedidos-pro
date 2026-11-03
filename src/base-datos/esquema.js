/**
 * Esquema y migraciones. Se ejecuta en cada arranque; es idempotente.
 * Para agregar una columna nueva: añade una entrada en MIGRACIONES (nunca borres las anteriores).
 */
'use strict';
const { db } = require('./conexion');
const log = require('../utilidades/registro');

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS platos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  precio REAL NOT NULL CHECK (precio >= 0),
  emoji TEXT NOT NULL DEFAULT '🍽️',
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa TEXT NOT NULL,
  nota TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'ordenado'
    CHECK (estado IN ('ordenado','cocinado','listo','entregado')),
  total REAL NOT NULL DEFAULT 0,
  cocinado_por TEXT,
  entregado_por TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS pedido_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  plato_id INTEGER REFERENCES platos(id),
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0)
);
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  sal TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin','cocina','mozo')),
  nombre TEXT NOT NULL DEFAULT '',
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS llamadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mozo','cuenta')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','atendida')),
  atendida_por TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha  ON pedidos(creado_en);
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa   ON pedidos(mesa);
CREATE INDEX IF NOT EXISTS idx_items_pedido   ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_estado ON llamadas(estado);
CREATE INDEX IF NOT EXISTS idx_platos_cat     ON platos(categoria_id);
`;

// Migraciones para bases de datos creadas con versiones anteriores.
const MIGRACIONES = [
  ['pedidos',  'cocinado_por',  'TEXT'],
  ['pedidos',  'entregado_por', 'TEXT'],
  ['llamadas', 'atendida_por',  'TEXT'],
  ['usuarios', 'activo',        'INTEGER NOT NULL DEFAULT 1'],
  ['usuarios', 'creado_en',     'TEXT'],
];

function aplicar() {
  db.exec(ESQUEMA);
  for (const [tabla, columna, tipo] of MIGRACIONES) {
    const existe = db.prepare(`PRAGMA table_info(${tabla})`).all().some(c => c.name === columna);
    if (!existe) {
      db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo}`);
      log.info(`Migración aplicada: ${tabla}.${columna}`);
    }
  }
}
module.exports = { aplicar };
