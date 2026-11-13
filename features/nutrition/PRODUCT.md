# Nutricionista ERP

Herramienta para profesionales con permisos Nutrition.Manage o Nutrition.Approve:
localizar pacientes, consultar resultados y ciclos y ajustar sus planes de 30 días.
Las generaciones válidas se publican automáticamente; la aprobación de un
nutricionista no es un requisito. La publicación manual conserva los permisos
y verificaciones del contrato vigente.

La dirección visual es el ERP CoppAddresd: navy y teal de marca, superficies
claras y acentos de la paleta compartida. La entrada usa un directorio de
pacientes a todo el ancho. Al seleccionar un paciente aparece la lista lateral
junto a su ficha; en móvil se muestra lista o ficha. Se reutilizan PageHeader,
SectionHeader, Tabs y los controles compartidos, con Plus Jakarta e Inter.

La ficha conserva tres pestañas: Resultados y ciclos, Programación y Plan de
30 días. El editor prioriza los alimentos y cantidades: los totales diarios,
totales por comida y nutrientes se consultan mediante desplegables. La suma de
calorías y la existencia de metas superadas siguen visibles sin abrirlos.
Los botones de comida muestran una sola a la vez y conservan la edición al
alternar. Las filas de pacientes, ciclos, alimentos e historial comparten una
escala compacta, separación ligera y acciones alineadas. Los iconos señalan
acciones, mediciones y comidas; las etiquetas son breves.

Las barras y verificaciones conservan sus cálculos. No se inventan datos ausentes
ni se ocultan errores o alertas críticas. Los estados, permisos, guardado,
versiones, publicación y devolución siguen perteneciendo al backend. La ficha ERP
omite el aviso nutricional por decisión de producto; este ajuste visual no
modifica el aviso del paciente ni el contrato del backend.

Contrato canónico: `openspec/changes/plan-nutricional-erp/DESIGN-SPEC.md` del workspace.

La vista Todos prioriza Publicados y Por renovar, antes de otros estados.
La paginación del ERP se compone con filtros de estado del API existente,
sin requerir el despliegue del nuevo orden del servidor.
