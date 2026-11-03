/**
 * Reportes de gerencia y estadísticas personales de cada empleado.
 */
'use strict';
const reportesRepo = require('../repositorios/reportesRepo');
const v = require('../utilidades/validacion');

function panelAdmin(rango = 'hoy') {
  const r = v.opcion(rango, reportesRepo.rangosValidos, 'rango');
  return {
    resumen: reportesRepo.resumen(r),
    topPlatos: reportesRepo.topPlatos(r),
    porMesa: reportesRepo.porMesa(r),
    porDia: reportesRepo.porDia(),
    historial: reportesRepo.historial(r),
    porEmpleado: reportesRepo.porEmpleado(r),
  };
}

/** Estadísticas del propio usuario; se exponen con nombres amigables. */
function personales(usuario) {
  const s = reportesRepo.deUnEmpleado(usuario.usuario);
  return {
    usuario: usuario.usuario,
    rol: usuario.rol,
    stats: { hoy: s.hoy, semana: s['7dias'], total: s.todo },
  };
}
module.exports = { panelAdmin, personales };
