import { saveAs } from 'file-saver'
import type { ProtocolFile } from '@opentrons/shared-data'
export const saveFile = (fileData: ProtocolFile, fileName: string): void => {
  const blob = new Blob([JSON.stringify(fileData, null, 2)], {
    type: 'application/json',
  })
  saveAs(blob, fileName)
}
