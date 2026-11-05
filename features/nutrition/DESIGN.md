---
name: Nutricionista ERP CoppAddresd
description: Mesa clínica de nutrición integrada en el ERP existente.
colors:
  action: "#023467"
  brand-teal: "#035d4d"
  background: "#eff2f7"
  card: "#ffffff"
  foreground: "#1a1d2e"
  muted: "#e2e8f0"
  muted-foreground: "#475569"
  info-soft: "#e0f2fe"
  info-foreground: "#075985"
  success-soft: "#d1fae5"
  success-foreground: "#065f46"
  warning-soft: "#fef3c7"
  warning-foreground: "#92400e"
  destructive-soft: "#fee2e2"
  destructive-foreground: "#991b1b"
  ai-soft: "#fff5d6"
  ai-foreground: "#694500"
  renew-soft: "#f3eafb"
  renew-foreground: "#6b3aa0"
typography:
  title:
    fontFamily: "var(--font-plex), sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "var(--font-plex), sans-serif"
    fontSize: "0.875rem"
  label:
    fontFamily: "var(--font-plex), sans-serif"
    fontSize: "0.75rem"
  measure:
    fontFamily: "var(--font-plex-mono), monospace"
rounded:
  control: "6px"
  disclosure: "8px"
  panel: "12px"
  chip: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  compact: "12px"
  md: "16px"
  detail: "20px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.card}"
    rounded: "{rounded.panel}"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "0 10px"
  select:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
  chip-review:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info-foreground}"
    rounded: "{rounded.chip}"
---

# Design System: Nutricionista ERP CoppAddresd

## Overview

**Creative North Star: "Mesa clínica del ERP existente"**

Este documento registra el módulo construido, con la dirección ya fijada por el owner. Su identidad procede del ERP CoppAddresd: cabecera navy hacia teal, superficies claras y jerarquía compacta. La continuidad entre bandeja y ficha permite revisar un paciente sin perder el contexto de trabajo.

El contenido clínico tiene prioridad sobre la decoración. La interfaz distingue datos, estados y acciones con texto, iconos y color; las verificaciones estructurales apoyan la revisión profesional sin certificar seguridad clínica. Su alcance es `features/nutrition`, no redefine el sistema global.

**Key Characteristics:**

- Dos paneles en escritorio y recorrido lista→ficha en móvil.
- Tres tareas accesibles mediante pestañas compartidas del ERP.
- IBM Plex Sans para lectura; IBM Plex Mono para cantidades tabulares.
- Superficies delimitadas y color semántico localizado.

Fuente de verdad visual: reglas efectivas de `nutrition.css`, componentes del módulo y primitivas compartidas. Evidencia observada: `openspec/changes/plan-nutricional-erp/screenshots/rework/` en el workspace, especialmente programación de escritorio y resultados de móvil, junto a `measurements.json`. Las capturas usan HTTP sintético explícito y acreditan composición; no datos clínicos reales. El contrato y la crítica de ese change explican la dirección, pero los valores registrados aquí proceden de la implementación.

## Colors

La marca concentra el peso visual en navy/teal; los estados usan fondos suaves con texto de contraste. El frontmatter registra el tema claro. En ejecución mandan las variables CSS y sus variantes de tema. En oscuro, el fondo es `#0b1120`, la superficie `#1e293b`, la acción `#7dd3fc` con texto `#082f49`; IA usa `#3b2d10` con texto `#f7d87e` y renovación `#302039` con texto `#d8b9f4`. El sidecar enlaza los componentes a variables CSS; sus rampas OKLCH son previsualizaciones sintetizadas, no tokens nuevos de producción.

### Primary

- **Navy clínico** (`action`): acciones principales y barras energéticas normales. El módulo construido sustituye el azul de acción anterior por `--brand-navy-deep`.
- **Teal de marca** (`brand-teal`): pertenece a la identidad ERP. La cabecera reutiliza `--brand-gradient`, cuyo extremo efectivo es `#0e5f63`; no equivale a pintar todas las tarjetas de teal.

### Secondary

- **Azul de revisión** (`info-soft`, `info-foreground`): paciente seleccionado, estado por aprobar e información provisional.
- **Verde de resultado** (`success-soft`, `success-foreground`): aprobado y comprobaciones estructurales correctas.
- **Ámbar de atención** (`warning-soft`, `warning-foreground`): advertencias. El exceso energético usa además `--nutrition-over-bar`; el texto conserva el papel semántico de advertencia.
- **Rojo clínico** (`destructive-soft`, `destructive-foreground`): devuelto, críticas y verificaciones por revisar; las barras de día incompleto usan `--destructive`.
- **Dorado IA** (`ai-soft`, `ai-foreground`): borrador y acciones de IA.
- **Violeta de renovación** (`renew-soft`, `renew-foreground`): por renovar; mantiene una función diferente de advertencia.

### Neutral

- **Fondo frío** (`background`) y **superficie clínica** (`card`): separan el entorno del trabajo.
- **Tinta** (`foreground`) y **pizarra secundaria** (`muted-foreground`): distinguen contenido y metadatos.
- **Gris de separación** (`muted`): controles secundarios, bordes y delimitadores; los bordes consumen `--border` en ejecución.

**The Estado explícito Rule.** El color acompaña una etiqueta, resultado o icono; una advertencia no adopta el violeta de renovación.

## Typography

IBM Plex Sans (`--font-plex`, fallback sans-serif) resuelve lectura y títulos locales. IBM Plex Mono (`--font-plex-mono`, fallback monospace) resuelve cantidades con `tabular-nums`. La cabecera y las secciones reutilizan las primitivas ERP; no se prescribe una nueva fuente para el shell.

- **Título de paciente:** peso semibold y escala del token `title`; en escritorio y móvil conserva la misma jerarquía.
- **Texto operativo:** escala `body`; acciones y pestañas de escritorio también usan texto compacto (13px).
- **Etiqueta:** escala `label` para lectura secundaria, horarios y verificaciones. El móvil conserva etiquetas de pestaña en esta escala con salto de línea.
- **Medida:** fuente `measure` para kcal, gramos, fechas y versiones. Los StatCard muestran cantidades de 24px en escritorio y 20px en móvil.

**The Cantidad legible Rule.** Una cifra conserva su unidad visible; la meta diaria y el inspector mensual muestran kcal.

## Layout

El padding exterior efectivo es 24px en escritorio y 12px por debajo de 1024px. Desde 1024px, la mesa forma dos columnas con separación de 16px: rail de 280px hasta 1279px y 304px desde 1280px; ficha flexible con `minmax(0, 1fr)`. La altura de mesa es `calc(100dvh - 204px)` con mínimo de 520px; bandeja y ficha tienen scroll independiente.

Por debajo de 1024px se muestra la lista o la ficha según la selección, con altura de documento y retorno explícito. La ficha reduce su padding interior de 20px a 14px. Las tres pestañas permanecen en tres columnas, envuelven texto y aumentan su altura mínima de 52px a 68px; no forman un carrusel horizontal.

Las secciones del rework usan 16px de padding y separación de 16px. Lecturas y horarios pasan de cuatro a dos columnas en móvil; las cuatro verificaciones pasan de dos columnas a una. Los filtros conservan dos columnas. Los resúmenes muestran tres métricas en escritorio y en móvil una métrica a todo el ancho sobre dos secundarias.

**The Contexto continuo Rule.** La selección no elimina la bandeja de escritorio; el móvil cambia de vista para preservar espacio legible.

## Elevation & Depth

La mesa clínica construye profundidad principalmente mediante superficie, borde y fondo de selección. Paneles y secciones locales no necesitan sombra propia. La cabecera conserva el degradado oficial ERP y las primitivas compartidas conservan sus estados: Button usa sombra pequeña al hover y un anillo de foco, mientras el diálogo de revisión mantiene su elevación modal. No se extiende esa elevación a todas las tarjetas.

Las transiciones compartidas de botón e input duran 200ms. El módulo no añade una coreografía propia ni anima las barras mensuales.

## Shapes

Paneles y secciones usan esquinas suaves del token `panel`. Disclosure usa `disclosure`; selectores, filtros y verificaciones usan `control`. Los estados son cápsulas (`chip`). Bordes de 1px separan comidas y filas; el paciente seleccionado combina fondo informativo y un check visible, sin franja lateral de selección. Los radios del shell compartido se conservan y no se deducen del radio local.

## Components

### Buttons

Acciones compactas de las primitivas Base UI del ERP, con altura mínima local de 44px, texto que puede envolver y ancho limitado al contenedor. La variante principal usa navy; outline usa fondo/borde neutral; ghost reserva el peso para el contenido. Hover oscurece la acción y añade la sombra compartida; foco visible combina borde y anillo. El estado deshabilitado conserva texto y fondo semánticos sin desaparecer por opacidad en Button.

### Inputs / Fields

La búsqueda reutiliza Input con altura mínima de 44px en el rail. Selectores nativos usan borde neutral, altura de 44px, padding del token `select` y foco de 2px con separación de 3px. Los campos numéricos usan Plex Mono. El selector de día reúne 30 opciones con anterior/siguiente; no despliega treinta botones táctiles.

### Chips

Estado redondeado con texto e icono cuando corresponde. En la bandeja se compacta a 11px con padding de 4px por 8px; fuera de ella utiliza 12px y padding de 6px por 10px. Son metadatos de estado, no sustituyen controles de acción.

### Cards / Containers

Rail y ficha comparten fondo card, borde neutral y radio `panel`. Las secciones dentro de la ficha usan padding `md`. SectionHeader y StatCard se reutilizan; el perfil y la bitácora se agrupan en disclosure con summary de al menos 44px. La ausencia de un dato se expresa como «Sin dato».

### Navigation

Tres Tabs de variante line: Resultados y ciclos, Programación y Plan de 30 días editar. La pestaña activa tiene subrayado e identidad textual; Base UI proporciona la interacción de teclado. En escritorio permanecen sticky dentro del scroll de la ficha. El paciente seleccionado tiene check y fondo informativo, hover muted y foco interior visible.

### Verificación y energía mensual

Cuatro filas con icono, etiqueta y resultado «Correcto» o «Revisar». La miniatura mensual reutiliza 30 barras calculadas sobre alimentos reales, línea de meta discontinua y escala común. Navy significa día normal, ámbar exceso y rojo día incompleto; el rojo de incompleto prevalece sobre exceso. El inspector expone kcal, meta y desviación con selección de día.

Las barras usan selección por clic y teclado con flechas, Home y End, foco visible y una sola entrada de tabulación. Su ancho responde a 30 columnas; el selector equivalente de 44px aporta acceso táctil legible. No se documentan las barras estrechas como blancos táctiles de 44px.

### Diálogo de revisión

Cabecera y acciones permanecen fuera del scroll; solo el cuerpo desplaza. El footer respeta `safe-area-inset-bottom`. La verificación y las barras son las mismas de Programación. Consentimiento de críticas inicialmente desmarcado y comentario para devolución pertenecen al flujo existente; el color verde del checklist no aprueba el plan.

## Do's and Don'ts

### Do:

- **Do** reutilizar PageHeader, SectionHeader, StatCard, Tabs y los estados semánticos del ERP.
- **Do** preservar unidades, cifras tabulares, desconocidos explícitos y errores visibles.
- **Do** conservar foco visible y controles operativos de al menos 44px, incluido el selector equivalente de las barras.
- **Do** usar las variantes CSS de tema en lugar de fijar los colores claros dentro de componentes.

### Don'ts:

- **Don't** convertir la validación estructural o el color de una barra en una decisión clínica.
- **Don't** añadir nuevas fuentes, emojis, paletas decorativas o servicios para reproducir esta presentación.
- **Don't** reemplazar el selector compacto de día por una matriz de treinta controles.
- **Don't** generalizar los tamaños excepcionales de 10–11px de ejes y microdatos de bandeja como texto operativo del módulo.
