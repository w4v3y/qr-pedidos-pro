/**
 * Errores de aplicación con código HTTP. Permite lanzar desde cualquier capa
 * y que el manejador central responda correctamente.
 */
'use strict';
class ErrorApp extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}
const errores = {
  peticionInvalida: (m = 'Petición inválida') => new ErrorApp(400, m),
  noAutenticado:    (m = 'Inicia sesión para continuar') => new ErrorApp(401, m),
  sinPermiso:       (m = 'No tienes permiso para esta acción') => new ErrorApp(403, m),
  noEncontrado:     (m = 'No encontrado') => new ErrorApp(404, m),
  conflicto:        (m = 'Conflicto con el estado actual') => new ErrorApp(409, m),
  demasiadas:       (m = 'Demasiadas peticiones, espera un momento') => new ErrorApp(429, m),
};
module.exports = { ErrorApp, errores };
