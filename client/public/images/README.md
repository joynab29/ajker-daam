# Product image files

The seed and the frontend reference these paths. Drop the matching JPG into this folder with the **exact filename**:

- `tomato.jpg` — vine tomatoes (Fresh Tomatoes)
- `hilsa.jpg` — silver hilsa fish on green leaves (Hilsa)
- `lentil.jpg` — red lentils (Lentil (Mosur))
- `rui.jpg` — rohu fish on ice (Rui Fish)

The `HeroImage` component falls back to a green gradient + emoji when a file is missing, so the marketplace still renders cleanly until you save them.

PNG/WebP also work — just rename to `<name>.jpg` (Vite serves whatever bytes are at that path).
