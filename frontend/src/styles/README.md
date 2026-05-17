# Estilos — SIGAM

CSS real, sin frameworks. Cada vista tiene su archivo `.css` y las clases
llevan prefijo para que **nunca se solapen** entre vistas.

## Estructura

```
src/styles/
  tokens.css     -> Variables de tema (colores, fondos, radios). EL archivo de temas.
  global.css     -> Reset, <body>, scrollbar, animaciones compartidas.
  README.md      -> Este documento.

src/features/<vista>/
  XxxPage.tsx    -> import './XxxPage.css'
  XxxPage.css    -> estilos de esa vista
```

Ambos archivos globales se importan una sola vez en `src/main.tsx`.

## Convención de nombres de clase

```
<vista>_<elemento>[_<n>]
```

- `<vista>`  = nombre corto de la pantalla o módulo: `login`, `home`, `sidebar`, `scan`...
- `<elemento>` = qué es: `boton`, `input`, `card`, `link`, `titulo`...
- `_<n>`  = número opcional cuando hay varios del mismo tipo: `_1`, `_2`...

Ejemplos: `login_input`, `login_submit`, `sidebar_link_1`, `scan_boton_1`.

Regla de oro: **toda clase empieza con el prefijo de su vista.** Así el CSS de
`login` jamás puede afectar al de `home`.

## Colores

Nunca se escribe un color fijo (`#ffffff`, `#00a88e`...) en el CSS de una vista.
Siempre se usa una variable de `tokens.css`:

```css
.login_submit {
  background: var(--primary);
  color: var(--on-primary);
}
```

Así, cambiar un color o agregar un tema nuevo se hace en **un solo lugar**
(`tokens.css`) y se refleja en toda la app.

## Tema claro / oscuro

Lo controla `<html data-theme="light|dark">`. Lo gestiona `ThemeProvider`
(`shared/theme/theme.tsx`) y un script en `index.html` lo aplica antes del
primer render. Para un tema nuevo: duplica un bloque `[data-theme="..."]` en
`tokens.css`.

## Estado de la migración

Migración a CSS real **completada**. Ninguna vista usa ya estilos inline
para diseño (solo quedan valores dinámicos puntuales: tamaños por prop y
variables `--xxx` calculadas, además de la config de recharts/toasts en JS).

- [x] `LoginPage` — plantilla de referencia (`LoginPage.css`)
- [x] Layout / sidebar (`Layout.css`)
- [x] Dashboard, Users, Finance, Documents, NFC, Reports (`*.css` por vista)
- [x] Componentes UI compartidos (`styles/components.css`, prefijo `ui_`)

### Mapa de archivos CSS

```
styles/tokens.css       -> variables de tema (colores)
styles/global.css       -> reset, body, animaciones, .app_loading
styles/components.css   -> componentes UI (ui_*)
features/<vista>/<Vista>.css   -> estilos de cada pantalla
shared/components/Layout.css   -> layout_* y sidebar_*
```
