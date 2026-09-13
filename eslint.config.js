import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/*
  Configuration ESLint au format plat (flat config) introduit par ESLint 9.

  Choix du niveau : "essential" et non "recommended".

  Le niveau recommended de eslint-plugin-vue ajoute des règles de mise en forme
  (indentation du template, nombre d'attributs par ligne, position des chevrons).
  Sur le code existant, il produit environ 2 770 signalements dont la quasi
  totalité sont de pure présentation, ce qui noie les vrais problèmes.

  Passer à recommended reste possible plus tard en une fois avec --fix.
*/
export default [
    {
        ignores: ['dist/**', 'node_modules/**', 'public/**']
    },

    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],

    {
        files: ['**/*.{js,vue}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            // Code destiné au navigateur : window, document, localStorage, fetch.
            globals: {...globals.browser}
        },
        rules: {
            /*
              Désactivée volontairement.

              La règle impose des noms de composants en plusieurs mots pour éviter
              toute collision avec une balise HTML native. Six composants du projet
              portent un nom simple et clair : Icon, Avatar, Modal, Toast, Pagination,
              Breadcrumb. Aucun ne correspond à une balise HTML existante.

              Les renommer pour satisfaire la règle toucherait tous leurs points
              d'appel sans rien améliorer.
            */
            'vue/multi-word-component-names': 'off'
        }
    }
]
