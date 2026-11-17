/**
 * Configuración persistente editable desde el panel (clave/valor).
 */
'use strict';
const { db } = require('../base-datos/conexion');

module.exports = {
  obtener(clave, porDefecto = '') {
    const r = db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave);
    return r ? r.valor : porDefecto;
  },
  guardar(clave, valor) {
    db.prepare(`INSERT INTO config (clave, valor) VALUES (?,?)
                ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`).run(clave, String(valor));
  },
};
