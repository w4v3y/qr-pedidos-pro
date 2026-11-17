/**
 * Consultas de reportes. Los rangos son una lista blanca: nunca se concatena entrada del usuario.
 */
'use strict';
const { db } = require('../base-datos/conexion');

const RANGOS = {
  hoy:    "date({T}.creado_en) = date('now','localtime')",
  '7dias': "{T}.creado_en >= datetime('now','localtime','-7 days')",
  todo:   '1=1',
};
const filtro = (rango, tabla) => (RANGOS[rango] || RANGOS.hoy).replace(/\{T\}/g, tabla);

module.exports = {
  rangosValidos: Object.keys(RANGOS),

  resumen(rango) {
    const f = filtro(rango, 'p');
    const r = db.prepare(`SELECT COUNT(*) AS pedidos, COALESCE(SUM(p.total),0) AS ventas
      FROM pedidos p WHERE p.estado = 'entregado' AND ${f}`).get();
    const enCurso = db.prepare(`SELECT COUNT(*) AS n FROM pedidos p WHERE p.estado != 'entregado' AND ${f}`).get().n;
    return { ...r, enCurso };
  },
  topPlatos(rango, limite = 10) {
    return db.prepare(`SELECT i.nombre, SUM(i.cantidad) AS cantidad, SUM(i.cantidad * i.precio) AS total
      FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
      WHERE p.estado = 'entregado' AND ${filtro(rango, 'p')}
      GROUP BY i.nombre ORDER BY cantidad DESC LIMIT ?`).all(limite);
  },
  porMesa(rango) {
    return db.prepare(`SELECT p.mesa, COUNT(*) AS pedidos, SUM(p.total) AS total FROM pedidos p
      WHERE p.estado = 'entregado' AND ${filtro(rango, 'p')} GROUP BY p.mesa ORDER BY total DESC`).all();
  },
  porDia() {
    return db.prepare(`SELECT date(creado_en) AS dia, COUNT(*) AS pedidos, SUM(total) AS total
      FROM pedidos WHERE estado = 'entregado' AND creado_en >= datetime('now','localtime','-14 days')
      GROUP BY dia ORDER BY dia DESC`).all();
  },
  historial(rango, limite = 50) {
    return db.prepare(`SELECT p.id, p.mesa, p.estado, p.total, p.cocinado_por, p.entregado_por,
      strftime('%d/%m %H:%M', p.creado_en) AS fecha FROM pedidos p
      WHERE ${filtro(rango, 'p')} ORDER BY p.creado_en DESC LIMIT ?`).all(limite);
  },
  porEmpleado(rango) {
    return db.prepare(`SELECT u.usuario, u.rol, u.nombre,
      (SELECT COUNT(*) FROM pedidos p WHERE p.cocinado_por  = u.usuario AND ${filtro(rango, 'p')}) AS cocinados,
      (SELECT COUNT(*) FROM pedidos p WHERE p.entregado_por = u.usuario AND ${filtro(rango, 'p')}) AS entregados,
      (SELECT COUNT(*) FROM llamadas l WHERE l.atendida_por = u.usuario AND ${filtro(rango, 'l')}) AS llamadas
      FROM usuarios u ORDER BY u.rol, u.usuario`).all();
  },
  deUnEmpleado(usuario) {
    const salida = {};
    for (const rango of Object.keys(RANGOS)) {
      salida[rango] = {
        cocinados:  db.prepare(`SELECT COUNT(*) AS n FROM pedidos p WHERE p.cocinado_por  = ? AND ${filtro(rango, 'p')}`).get(usuario).n,
        entregados: db.prepare(`SELECT COUNT(*) AS n FROM pedidos p WHERE p.entregado_por = ? AND ${filtro(rango, 'p')}`).get(usuario).n,
        llamadas:   db.prepare(`SELECT COUNT(*) AS n FROM llamadas l WHERE l.atendida_por = ? AND ${filtro(rango, 'l')}`).get(usuario).n,
      };
    }
    return salida;
  },
};
