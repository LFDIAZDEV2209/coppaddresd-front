# Iconos 3D animados

Componente compartido: `components/ui/animated-icon.tsx`. Catálogo inicial: `medical-kit`, `status-check`, `invitation`, `status-pause`. Se reutiliza la familia gráfica existente, sin dependencias nuevas.

```tsx
<button data-icon-motion>
  <AnimatedIcon name="invitation" size={76} />
  Invitaciones
</button>
```

Secuencias semánticas de 5–6 segundos, desfasadas y con reposo entre acciones: botiquín abre la tapa y muestra material, sobre eleva/envía una carta y confirma, check se traza y celebra, pausa se hunde como pulsador y vuelve a su posición. Hover/foco amplifica la respuesta del contenedor; pulsación comprime suavemente. Capas separadas evitan que la interacción reinicie el ciclo.

`animated-icon-artwork.tsx` contiene piezas SVG originales con volumen simulado mediante geometría y gradientes. Sustituyen el sprite raster para permitir animación interna; no son modelos 3D ni recursos oficiales de Rappi. Cada instancia usa IDs únicos para sus gradientes. Los estados son decorativos: no indican que se haya enviado una invitación ni confirmado una operación real.

Botiquín corregido tras revisión visual: tapa articulada en un punto fijo (20,52), apertura de 16 grados sin escalar ni desplazar la tapa, bisagra visible y borde de cierre alineado. Material oculto detrás del frontal al cerrar; aparece de forma limitada al abrir. Se retiró el balanceo adicional de la pieza completa para que la apertura sea clara.

IntersectionObserver pausa fuera del viewport; visibilitychange pausa en pestañas ocultas. La preferencia reduced-motion detiene animaciones y transiciones, también si cambia durante la sesión. `motion={false}` permite una versión estática. No se ejecuta un render React por frame ni se usa un bucle JavaScript.

Los iconos son decorativos: la etiqueta accesible y la acción pertenecen al botón o encabezado. Para ampliar el catálogo, añadir una entrada tipada, sus piezas en Artwork y keyframes específicos; conservar el control común de visibilidad y accesibilidad. No extender los estados de dominio de Profesionales a otros módulos: DirectoryIcon solo adapta nombres locales al catálogo compartido.
