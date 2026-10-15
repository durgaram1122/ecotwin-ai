# Gemini integration notes

Verified 2026-10-15 against official Google documentation:

- `gemini-3.1-flash-lite` is listed by the active key as a vision-capable model supporting `generateContent` and returned HTTP 200 with inline image data during runtime testing. It is EcoTwin's default configurable vision model after the heavier flash models returned intermittent HTTP 503 high-demand responses.
- Gemini image understanding supports inline base64 image data with `inline_data` / `mime_type` in `generateContent` requests, including `image/png`, `image/jpeg`, and `image/webp`.
- The Gemini models endpoint can list models and their supported actions; a configured `GEMINI_MODEL` should support `generateContent` for the active API key.
- Keep `GEMINI_API_KEY` server-only. The image-analysis route sends the validated base64 bytes to Gemini and persists successful results only.

Sources:
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/image-understanding
- https://ai.google.dev/api/models
