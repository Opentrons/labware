/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="vitest" />
/// <reference types="vite/client" />
import path from 'path'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mts'

// eslint-disable-next-line import/no-default-export
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      allowOnly: true,
      exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
      setupFiles: ['./setup-vitest.mts'],
      coverage: {
        exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
    resolve: {
      alias: {
        '@opentrons/components/styles': path.resolve(
          './components/src/index.module.css'
        ),
        '@opentrons/components': path.resolve('./components/src/index.ts'),
        '@opentrons/shared-data/pipette/fixtures/name': path.resolve(
          './shared-data/pipette/fixtures/name/index.ts'
        ),
        '@opentrons/shared-data/labware/fixtures/1': path.resolve(
          './shared-data/labware/fixtures/1/index.ts'
        ),
        '@opentrons/shared-data/labware/fixtures/2': path.resolve(
          './shared-data/labware/fixtures/2/index.ts'
        ),
        '@opentrons/shared-data': path.resolve('./shared-data/js/index.ts'),
        '@opentrons/step-generation': path.resolve(
          './step-generation/src/index.ts'
        ),
        '@opentrons/api-client': path.resolve('./api-client/src/index.ts'),
        '@opentrons/react-api-client': path.resolve(
          './react-api-client/src/index.ts'
        ),
        '@opentrons/discovery-client': path.resolve(
          './discovery-client/src/index.ts'
        ),
        '@opentrons/usb-bridge/node-client': path.resolve(
          './usb-bridge/node-client/src/index.ts'
        ),
        '@opentrons/labware-library': path.resolve(
          './labware-library/src/labware-creator/index.tsx'
        ),
        // "The resulting path (...) trailing slashes are removed unless the path is resolved to the root directory."
        // https://nodejs.org/api/path.html#pathresolvepaths
        '/app/': path.resolve('./app/src/') + '/',
      },
    },
  })
)
