import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
const __dir = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: {
    tailwindcss: { config: resolve(__dir, './tailwind.config.js') },
    autoprefixer: {},
  },
}
