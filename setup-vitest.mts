import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { vi, afterEach } from 'vitest'

vi.mock('protocol-designer/src/labware-defs/utils')
vi.mock('electron-store')
vi.mock('electron-updater')
vi.mock('electron')
vi.mock('./app/src/redux/shell/remote')
vi.mock('./app/src/resources/useNotifyDataReady', async () => {
  const actual = await vi.importActual('./app/src/resources/useNotifyDataReady')
  return {
    ...actual,
    useNotifyDataReady: () => ({
      notifyOnSettled: vi.fn(),
      isNotifyEnabled: true,
    }),
  }
})

process.env.OT_PD_VERSION = 'fake_PD_version'
global._PKG_VERSION_ = 'test environment'
global._OPENTRONS_PROJECT_ = 'robotics'
global._PKG_PRODUCT_NAME_ = 'test product'
global._PKG_BUGS_URL_ = 'http://bugs.contoso.com'

afterEach(() => {
  cleanup()
})
