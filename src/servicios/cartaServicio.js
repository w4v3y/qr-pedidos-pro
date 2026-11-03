/**
 * Lógica de la carta (menú).
 */
'use strict';
const { LIMITES } = require('../config');
const menuRepo = require('../repositorios/menuRepo');
const { errores } = require('../utilidades/errores');
const v = require('../utilidades/validacion');

module.exports = {
  publica: () => menuRepo.cartaPublica(),
  completa: () => menuRepo.cartaCompleta(),

  crearPlato(datos) {
    return menuRepo.crearPlato({
      categoria_id: v.entero(datos.categoria_id, { min: 1, campo: 'categoría' }),
      nombre: v.texto(datos.nombre, { max: LIMITES.largoNombre, minimo: 1, campo: 'nombre del plato' }),
      descripcion: v.texto(datos.descripcion, { max: LIMITES.largoDescripcion }),
      precio: v.decimal(datos.precio),
      emoji: v.texto(datos.emoji || '🍽️', { max: 8 }),
    });
  },
  actualizarPlato(id, datos) {
    const campos = {};
    if (datos.nombre !== undefined) campos.nombre = v.texto(datos.nombre, { max: LIMITES.largoNombre, minimo: 1, campo: 'nombre' });
    if (datos.descripcion !== undefined) campos.descripcion = v.texto(datos.descripcion, { max: LIMITES.largoDescripcion });
    if (datos.precio !== undefined) campos.precio = v.decimal(datos.precio);
    if (datos.emoji !== undefined) campos.emoji = v.texto(datos.emoji, { max: 8 });
    if (datos.activo !== undefined) campos.activo = datos.activo ? 1 : 0;
    if (datos.categoria_id !== undefined) campos.categoria_id = v.entero(datos.categoria_id, { min: 1, campo: 'categoría' });
    if (!menuRepo.actualizarPlato(v.entero(id, { min: 1, campo: 'plato' }), campos))
      throw errores.noEncontrado('El plato no existe o no hubo cambios');
  },
  crearCategoria(nombre) {
    const n = v.texto(nombre, { max: 50, minimo: 1, campo: 'nombre de la categoría' });
    try { return menuRepo.crearCategoria(n); }
    catch (_) { throw errores.conflicto('Esa categoría ya existe'); }
  },
};
