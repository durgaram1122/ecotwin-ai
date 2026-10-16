# Gemini integration notes

Verified 2026-10-16 against official Google documentation:

- `gemini-3.5-flash-lite` is Google's active recommended lightweight vision model supporting `generateContent`, returning fast responses (~2-4s) with inline image data. It replaces `gemini-3.1-flash-lite` as EcoTwin's default vision model due to frequent high-demand HTTP 503 errors on the 3.1 preview.
- **Model Fallback Cascade**: When `GEMINI_MODEL` (or the default `gemini-3.5-flash-lite`) encounters temporary 503 high-demand or 429 quota spikes, EcoTwin retries with exponential backoff and automatically falls back across compatible vision models (`gemini-3.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-3.1-flash-lite`) before failing.
- **Header Authentication**: The `GEMINI_API_KEY` is sent via the `x-goog-api-key` HTTP header rather than query string parameters to prevent exposing the key in URLs, network logs, or error traces.
- Gemini image understanding supports inline base64 image data with `inline_data` / `mime_type` in `generateContent` requests, including `image/png`, `image/jpeg`, and `image/webp`.
- Keep `GEMINI_API_KEY` server-only. The image-analysis route sends validated base64 bytes to Gemini and persists successful results only.

Sources:
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/image-understanding
- https://ai.google.dev/api/models

