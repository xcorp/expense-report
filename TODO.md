# TODO / Feature List

## Features

- [ ] Session-aware Google Maps autocomplete: Use session tokens and the new AutocompletionService so users can search their own saved places (e.g., "Home", "Work") in the address autocomplete field. This will require migration to the new Google Maps Places API and handling user session tokens for personalized suggestions.

## Notes
- This is a future enhancement. Current implementation uses the legacy Autocomplete API and does not support user-specific saved places.

## Mobile OCR Troubleshooting

- [ ] Investigate OCR failure on Firefox for Android: the same JPEG uploaded from Google Drive is successfully OCR'd on desktop Firefox but fails on Firefox Android (Samsung S25 Ultra). Investigate browser console errors, image format issues (HEIC vs JPEG), Tesseract.js worker/memory limits, and add mobile-specific logging, client-side resizing/compression, and a server-side OCR fallback if necessary.

