# Fuentes locales del ERP

Estas son las mismas familias y pesos que `app/layout.tsx` cargaba con `next/font/google`. Se sirven con `next/font/local` para que desarrollo y producción no dependan de descargar CSS o fuentes durante la compilación.

La carga remota fallaba en Next.js 16.3.0 cuando Google Fonts devolvía URLs `/l/font?kit=...` sin extensión: [incidencia oficial #99114](https://github.com/vercel/next.js/issues/99114). La integración local sigue la [documentación oficial de Next.js](https://nextjs.org/docs/app/api-reference/components/font#local-fonts). No necesita parches ni cambios de versiones.

## Procedencia y licencia

Fuente primaria: repositorio oficial [google/fonts, commit `2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc`](https://github.com/google/fonts/tree/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc). Se descargaron los TTF normales y los `OFL.txt` de ese commit el 3 de noviembre de 2026. Cada familia conserva su licencia SIL Open Font License 1.1 en esta carpeta. Los archivos no se obtuvieron de terceros.

| Archivo local | TTF original dentro de google/fonts | Cobertura Unicode |
| --- | --- | ---: |
| `inter.woff2` | [ofl/inter/Inter[opsz,wght].ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/inter/Inter%5Bopsz,wght%5D.ttf) | 2849 puntos de código |
| `plus-jakarta-sans.woff2` | [ofl/plusjakartasans/PlusJakartaSans[wght].ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf) | 721 puntos de código |
| `geist-mono.woff2` | [ofl/geistmono/GeistMono[wght].ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/geistmono/GeistMono%5Bwght%5D.ttf) | 889 puntos de código |
| `ibm-plex-sans.woff2` | [ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/ibmplexsans/IBMPlexSans%5Bwdth,wght%5D.ttf) | 891 puntos de código |
| `ibm-plex-mono-400.woff2` | [ofl/ibmplexmono/IBMPlexMono-Regular.ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/ibmplexmono/IBMPlexMono-Regular.ttf) | 930 puntos de código |
| `ibm-plex-mono-500.woff2` | [ofl/ibmplexmono/IBMPlexMono-Medium.ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/ibmplexmono/IBMPlexMono-Medium.ttf) | 930 puntos de código |
| `ibm-plex-mono-600.woff2` | [ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf](https://github.com/google/fonts/blob/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc/ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf) | 930 puntos de código |

## Conservación de la tipografía

- Inter conserva el rango de peso 100–900. Su eje óptico `opsz` se fijó en 14, el valor predeterminado que seleccionaba la petición anterior a Google Fonts, que solo solicitaba `wght`. Así no se activa un tamaño óptico diferente al cambiar el tamaño del texto.
- Plus Jakarta Sans conserva el rango 200–800 y Geist Mono 100–900.
- IBM Plex Sans conserva el archivo variable completo, con ancho normal 100, y se registra únicamente para los cuatro pesos anteriores: 400, 500, 600 y 700. Las cuatro declaraciones reutilizan un solo archivo.
- IBM Plex Mono conserva los archivos estáticos 400, 500 y 600.
- Se conserva el estilo normal, `display: swap` (valor predeterminado de ambos loaders), la precarga y las cinco variables CSS originales. Las cursivas sintetizadas mantienen el comportamiento anterior.
- Todos los glifos originales se conservan. No se hizo ningún recorte por idioma; las tildes, la ñ y los caracteres extendidos siguen disponibles. `subsets: ["latin"]` en la carga anterior indicaba la precarga, no una restricción de la cobertura disponible.

## Conversión y verificación

Los TTF se convirtieron a WOFF2 con FontTools 4.68.0 y Brotli 1.2.1 en un entorno temporal, sin añadir dependencias al proyecto. La única instancia de ejes fue `instantiateVariableFont(font, {"opsz": 14}, inplace=True)` para Inter. Antes y después se verificó que `getBestCmap()` conservaba todos los puntos de código. Se mantuvo `recalcTimestamp=False` y se guardó con `font.flavor = "woff2"`.

Para regenerar cada archivo, descargar su TTF desde el commit indicado y usar:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("fuente-original.ttf", recalcTimestamp=False)
# Solo para Inter:
# font = instantiateVariableFont(font, {"opsz": 14}, inplace=True)
font.recalcTimestamp = False
font.flavor = "woff2"
font.save("fuente-local.woff2")
```

Integridad SHA-256 de los archivos originales y locales:

| Archivo local | SHA-256 TTF original | SHA-256 WOFF2 local |
| --- | --- | --- |
| `inter.woff2` | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` | `b33cb85c06adfd76d777d9de472c8a33b85154e2e7e686af467387e1e43ed494` |
| `plus-jakarta-sans.woff2` | `89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8` | `7c59703703f40fb5ff0d634b2a15c9d72dab6377841bd273eb4c8ce9a02f0143` |
| `geist-mono.woff2` | `d00e590b8eb3a59acc329b2d044fd143ae935090b7da33199ebee27cc7de8196` | `09853cd11045cf50e8ac07faf08bd5420f181b924f4c65b93b8ee49259a03734` |
| `ibm-plex-sans.woff2` | `3b031aa4216174205bd8471f88a49b91f093169e9e87bd5262242bc5967fe2e3` | `4aea8c49bb04155bced7cdea9ed0ed86b5a45da94b2ca54065ac9cb4098efcdb` |
| `ibm-plex-mono-400.woff2` | `6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46` | `13b16cd770a73f60304510221c3e7186d396ba6ca5d64c52b5c6fb983d0e900a` |
| `ibm-plex-mono-500.woff2` | `a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755` | `0498bcb48294756b5ac9062290e1639e907b1ec69b5dc2e8cfdec3fab58e0bc8` |
| `ibm-plex-mono-600.woff2` | `d3c38e55c78f5b0f28009fddba4834ec503278936a5986032424c9bd2d23aa46` | `5148e1fccb46851e8a7dcc489ff7d3d5e54717ee72e2865c2fa225e3fc4744e8` |
