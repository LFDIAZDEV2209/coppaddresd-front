# Resultados registrados y clasificación — QA 2026-10-08

La verificación de producción encontró una síntesis local presentada como IA:
AHS con un incremento fijo, dimensiones sin datos con valores orientativos,
correlaciones y recomendaciones clínicas predefinidas. No existe una respuesta
persistida de IA detrás de ese panel. Se sustituye por un estado explícito de
análisis no disponible; permanecen el historial, las respuestas y los resultados.

La clasificación de cada evaluación conserva `results[].severity` del resultado
principal. No se aplican cortes universales de 40/70 a puntajes crudos de escalas
diferentes. Sin severidad, el resultado y la tipificación no inventan riesgo bajo.
La severidad persistida es válida aunque no haya puntaje numérico. El radar usa
solamente porcentajes normalizados presentes, sin sustituirlos por puntajes crudos.

La selección del resultado actual ordena completados por fecha real, independiente
del orden descendente de la API. Los contadores del resumen usan el mismo conjunto
de resultados que el denominador; no mezclan evaluaciones históricas con ese total.

Validación: nueve regresiones de clasificación/orden/indicadores, TypeScript,
ESLint e i18n. El build de producción y la comprobación visual del cambio requieren
el checkout de esta corrección; no equivalen a una verificación de despliegue.
