import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import postCssImport from 'postcss-import'
import postCssApply from 'postcss-apply'
import postColorModFunction from 'postcss-color-mod-function'
import postCssPresetEnv from 'postcss-preset-env'
import lostCss from 'lost'
import { versionForProject } from '../scripts/git-version.mjs'
import type { UserConfig } from 'vite'

// eslint-disable-next-line import/no-default-export
export default defineConfig(
  async (): Promise<UserConfig> => {
    const OT_PD_VERSION = await versionForProject('protocol-designer')
    const OT_PD_BUILD_DATE = new Date().toUTCString()
    return {
      // this makes imports relative rather than absolute
      base: '',
      build: {
        // Relative to the root
        outDir: 'dist',
      },
      plugins: [
        react({
          include: '**/*.tsx',
          babel: {
            // Use babel.config.js files
            configFile: true,
          },
        }),
      ],
      optimizeDeps: {
        esbuildOptions: {
          target: 'es2020',
        },
      },
      css: {
        postcss: {
          plugins: [
            postCssImport({ root: 'src/' }),
            postCssApply(),
            postColorModFunction(),
            postCssPresetEnv({ stage: 0 }),
            lostCss(),
          ],
        },
      },
      define: {
        'process.env': { ...process.env, OT_PD_VERSION, OT_PD_BUILD_DATE },
        global: 'globalThis',
      },
      resolve: {
        alias: {
          '@opentrons/components/styles': path.resolve(
            '../components/src/index.module.css'
          ),
          '@opentrons/components': path.resolve('../components/src/index.ts'),
          '@opentrons/shared-data': path.resolve('../shared-data/js/index.ts'),
          '@opentrons/step-generation': path.resolve(
            '../step-generation/src/index.ts'
          ),
        },
      },
      server: {
        port: 5178,
      },
    }
  }
)
