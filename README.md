## 🚀 Publicar en GitHub Pages (3 pasos)

Este repo ya incluye un **workflow de despliegue automático**
(`.github/workflows/deploy.yml`): GitHub compila y publica la app por vos.

### Paso 1 · Creá el repositorio (30 segundos)

1. Entrá a 👉 [github.com/new](https://github.com/new)
2. En *Repository name* poné el nombre que quieras (ej. `asistente-gem`,
   `asis-90`, lo que sea — el `base` de Vite se autodetecta).
3. Elegí **Public** y tocá **Create repository**.
4. **NO inicialices** con README, .gitignore ni license (ya los tenés).

### Paso 2 · Subí los archivos (arrastrar y soltar)

1. En la página de tu nuevo repo, tocá **Add file → Upload files**
2. Arrastrá **todos los archivos y carpetas del proyecto**, **excepto**:
   - `node_modules/`
   - `dist/`
3. Tocá **Commit changes** y esperá: verás en la pestaña **Actions** cómo
   GitHub compila y publica solo (~1 minuto).

> 💡 **A partir de ahora, cada cambio que subas se republica automáticamente.**
> Si algo falla, mirá la pestaña **Actions** del repo.

### Paso 3 · Activá GitHub Pages (una sola vez)

1. En el repo, andá a **Settings → Pages**
2. En **Source** elegí **GitHub Actions** (en lugar de "Deploy from a branch")

### Paso 4 · Cargá la API Key como Secret (CRÍTICO)

Sin este paso la app desplegada no responde.

1. En el repo, andá a **Settings → Secrets and variables → Actions**
2. Tocá **New repository secret**
3. Completá:
   - **Name:** `VITE_GEMINI_API_KEY`
   - **Secret:** tu key de Gemini (la que empieza con `AQ.` o `AIzaSy…`)
4. Tocá **Add secret**
5. Volvé a **Actions** → seleccioná el último workflow fallido (si lo hay)
   → **Re-run jobs**. Con el secret cargado, el build termina y la página
   queda online en:
   `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`

> La key queda encriptada en GitHub y nunca aparece en el código público.

---

## ⚙️ Ajustes rápidos

| Qué                          | Dónde                                           |
| ---------------------------- | ----------------------------------------------- |
| Modelo de IA                 | `GEMINI_MODEL` en `src/lib/gemini.ts`           |
| Prompt del sistema           | `SYSTEM_PROMPT` en `src/lib/gemini.ts`          |
| Volumen de los sonidos       | `SOUND_VOLUME` en `src/lib/sounds.ts`           |

---

## 🧪 Desarrollo local (opcional)

```bash
npm install
npm run dev       # abre la app en modo desarrollo
npm run build     # compila para producción (carpeta dist/)
```

Para desarrollo local con la key por env:

```bash
cp .env.example .env
# editá .env y pegá tu key en VITE_GEMINI_API_KEY
npm run dev
```

---

## Cómo funciona

- **3 botones fijos**: Grabar/Pausar · Enviar · Escuchar/Pausar voz
- La grabación usa `MediaRecorder` con `pause()`/`resume()`: todo se acumula
  en un único clip sin importar las pausas.
- El audio viaja en Base64 dentro de `inlineData` a Gemini.
- La respuesta se lee con `speechSynthesis` (voz en español) y queda en la
  **Bitácora** para volver a escucharla.
