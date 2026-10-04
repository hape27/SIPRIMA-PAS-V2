# SIPRIMA PAS V5

Fixes the frontend Docker build path so Vite builds the React application without
using `tsc -b` as the production build gate. Type checking remains available via
`npm run typecheck` for development/QA.

This is intended for the local Docker deployment path.
