import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Read `VITE_BASE` (or `BASE`) from env to allow overriding base at build time.
// Defaults to the project site path '/expense-report/'.
const base = process.env.VITE_BASE || process.env.BASE || '/expense-report/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
