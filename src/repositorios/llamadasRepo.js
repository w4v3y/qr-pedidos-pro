/**
 * Acceso a datos de llamadas al mozo / pedidos de cuenta.
 */
'use strict';
const { db } = require('../base-datos/conexion');

module.exports = {
  pendienteDe(mesa, tipo) {
    return db.prepare("SELECT id FROM llamadas WHERE mesa = ? AND tipo = ? AND estado = 'pendiente'").get(mesa, tipo);
  },
  crear(mesa, tipo) {
    return Number(db.prepare('INSERT INTO llamadas (mesa, tipo) VALUES (?,?)').run(mesa, tipo).lastInsertRowid);
  },
  pendientes() {
    return db.prepare(`SELECT id, mesa, tipo, strftime('%H:%M', creado_en) AS hora
                       FROM llamadas WHERE estado = 'pendiente' ORDER BY creado_en`).all();
  },
  atender(id, usuario) {
    return db.prepare("UPDATE llamadas SET estado = 'atendida', atendida_por = ? WHERE id = ? AND estado = 'pendiente'")
      .run(usuario, id).changes;
  },
  contarRecientesDeMesa(mesa, segundos) {
    return db.prepare(`SELECT COUNT(*) AS n FROM llamadas
      WHERE mesa = ? AND creado_en >= datetime('now','localtime','-${Number(segundos)} seconds')`).get(mesa).n;
  },
};
