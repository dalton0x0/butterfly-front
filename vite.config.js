import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    build: {
        target: 'es2022'
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    test: {
        /*
          Environnement node et non jsdom.

          Les modules couverts ici sont du JavaScript pur. Le seul qui touche au
          navigateur est tokenStorage dont le test fournit deux implantations de
          stockage en mémoire. Charger un DOM complet coûterait une dépendance et
          quelques secondes par exécution sans rien apporter.

          Le jour où des composants Vue seront testés, il faudra basculer sur jsdom
          ou happy-dom et ajouter @vue/test-utils.
        */
        environment: 'node',
        include: ['src/**/*.test.js']
    }
})
