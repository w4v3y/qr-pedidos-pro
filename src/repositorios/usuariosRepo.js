/**
 * Acceso a datos de usuarios del personal.
 */
'use strict';
const { db } = require('../base-datos/conexion');

module.exports = {
  porNombre(usuario) { return db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario); },
  listar() {
    return db.prepare('SELECT usuario, rol, nombre, activo, creado_en FROM usuarios ORDER BY rol, usuario').all();
  },
  crear({ usuario, hash, sal, rol, nombre }) {
    db.prepare('INSERT INTO usuarios (usuario, hash, sal, rol, nombre) VALUES (?,?,?,?,?)')
      .run(usuario, hash, sal, rol, nombre);
  },
  actualizarClave(usuario, hash, sal) {
    return db.prepare('UPDATE usuarios SET hash = ?, sal = ? WHERE usuario = ?').run(hash, sal, usuario).changes;
  },
  eliminar(usuario) { return db.prepare('DELETE FROM usuarios WHERE usuario = ?').run(usuario).changes; },
  contarPorRol(rol) { return db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE rol = ?').get(rol).n; },
};
