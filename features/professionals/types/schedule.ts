/** Tipos del recurso de horarios semanales del profesional. */

/**
 * Franja horaria semanal tal como la expone el backend
 * (contrato verificado en EmployeeDtos.cs → ProfessionalScheduleDto):
 * weekday 1–7 ISO (1=lunes … 7=domingo), startTime/endTime "HH:mm" sin zona.
 * convención de zona horaria: la hora es la local de la clínica (TimeOnly
 * del backend), el ERP la muestra y edita tal cual.
 */
export interface ProfessionalScheduleDto {
  weekday: number;
  startTime: string;
  endTime: string;
}

/** Fila editable del formulario de horarios (misma forma que el DTO). */
export type ScheduleFormRow = ProfessionalScheduleDto;

/**
 * Weekdays ISO soportados por el contrato backend (máx. 7 filas, una por
 * día). El orden de este arreglo es el orden de lectura de la tabla.
 */
export const ISO_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** Máximo de franjas que acepta el backend (una por weekday). */
export const MAX_SCHEDULE_ROWS = 7;

/** Key de traducción del nombre del día para cada weekday ISO. */
export const WEEKDAY_KEYS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};
