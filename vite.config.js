import { defineConfig } from 'vite'
import vite_manifest from "./scripts/vite_manifest"
export default defineConfig({
  plugins:[
    vite_manifest({fileName:"manifest.json"}),
  ]
})