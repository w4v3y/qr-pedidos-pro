/**
 * Acceso a datos de pedidos.
 */
'use strict';
const { db, enTransaccion } = require('../base-datos/conexion');

const SQL_HOY = "date(creado_en) = date('now','localtime')";

module.exports = {
  crear({ mesa, nota, items, total }) {
    return enTransaccion(() => {
      const id = Number(db.prepare('INSERT INTO pedidos (mesa, nota, total) VALUES (?,?,?)')
        .run(mesa, nota, total).lastInsertRowid);
      const ins = db.prepare(
        'INSERT INTO pedido_items (pedido_id, plato_id, nombre, precio, cantidad) VALUES (?,?,?,?,?)');
      for (const it of items) ins.run(id, it.id, it.nombre, it.precio, it.cant);
      return id;
    });
  },
  obtener(id) {
    const p = db.prepare(`SELECT id, mesa, nota, estado, total, cocinado_por, entregado_por,
                          strftime('%H:%M', creado_en) AS hora FROM pedidos WHERE id = ?`).get(id);
    if (!p) return null;
    p.items = db.prepare('SELECT nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?').all(id);
    return p;
  },
  estadoDe(id) { return db.prepare('SELECT id, estado FROM pedidos WHERE id = ?').get(id); },

  cambiarEstado(id, estado, usuario) {
    const col = estado === 'cocinado' ? 'cocinado_por' : estado === 'entregado' ? 'entregado_por' : null;
    const sql = `UPDATE pedidos SET estado = ?${col ? `, ${col} = ?` : ''},
                 actualizado_en = datetime('now','localtime') WHERE id = ?`;
    return db.prepare(sql).run(...(col ? [estado, usuario, id] : [estado, id])).changes;
  },

  /** Pedidos activos del día con sus ítems (para cocina y mozo). */
  activosDeHoy() {
    const pedidos = db.prepare(`
      SELECT id, mesa, nota, estado, total, strftime('%H:%M', creado_en) AS hora, creado_en
      FROM pedidos WHERE estado != 'entregado' AND ${SQL_HOY} ORDER BY creado_en`).all();
    if (!pedidos.length) return [];
    const items = db.prepare(`SELECT pedido_id, nombre, cantidad FROM pedido_items
      WHERE pedido_id IN (SELECT id FROM pedidos WHERE estado != 'entregado' AND ${SQL_HOY})`).all();
    for (const p of pedidos) p.items = items.filter(i => i.pedido_id === p.id);
    return pedidos;
  },

  /** Versión mínima para el canal público: no expone notas ni montos ajenos. */
  estadosDeHoy() {
    return db.prepare(`SELECT id, mesa, estado FROM pedidos WHERE ${SQL_HOY}`).all();
  },

  contarRecientesDeMesa(mesa, segundos) {
    return db.prepare(`SELECT COUNT(*) AS n FROM pedidos
      WHERE mesa = ? AND creado_en >= datetime('now','localtime','-${Number(segundos)} seconds')`).get(mesa).n;
  },
};
