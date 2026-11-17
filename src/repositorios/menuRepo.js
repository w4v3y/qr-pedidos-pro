/**
 * Acceso a datos de la carta (categorías y platos). Solo SQL, sin lógica de negocio.
 */
'use strict';
const { db } = require('../base-datos/conexion');

module.exports = {
  cartaPublica() {
    const cats = db.prepare('SELECT id, nombre FROM categorias WHERE activo = 1 ORDER BY orden, id').all();
    const platos = db.prepare(
      'SELECT id, categoria_id, nombre, descripcion, precio, emoji FROM platos WHERE activo = 1 ORDER BY id').all();
    return cats
      .map(c => ({ id: c.id, cat: c.nombre, items: platos.filter(p => p.categoria_id === c.id) }))
      .filter(c => c.items.length > 0);
  },
  cartaCompleta() {
    return {
      categorias: db.prepare('SELECT * FROM categorias ORDER BY orden, id').all(),
      platos: db.prepare('SELECT * FROM platos ORDER BY categoria_id, id').all(),
    };
  },
  platoActivo(id) {
    return db.prepare('SELECT id, nombre, precio FROM platos WHERE id = ? AND activo = 1').get(id);
  },
  crearPlato({ categoria_id, nombre, descripcion, precio, emoji }) {
    return Number(db.prepare(
      'INSERT INTO platos (categoria_id, nombre, descripcion, precio, emoji) VALUES (?,?,?,?,?)')
      .run(categoria_id, nombre, descripcion, precio, emoji).lastInsertRowid);
  },
  actualizarPlato(id, campos) {
    const permitidos = ['nombre', 'descripcion', 'precio', 'emoji', 'activo', 'categoria_id'];
    const sets = [], vals = [];
    for (const c of permitidos) if (campos[c] !== undefined) { sets.push(`${c} = ?`); vals.push(campos[c]); }
    if (!sets.length) return 0;
    vals.push(id);
    return db.prepare(`UPDATE platos SET ${sets.join(', ')} WHERE id = ?`).run(...vals).changes;
  },
  crearCategoria(nombre) {
    const max = db.prepare('SELECT COALESCE(MAX(orden),0) AS m FROM categorias').get().m;
    return Number(db.prepare('INSERT INTO categorias (nombre, orden) VALUES (?,?)')
      .run(nombre, max + 1).lastInsertRowid);
  },
};
