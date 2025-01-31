// tests for labware directory utilities

import path from 'path'
import fs from 'fs-extra'
import tempy from 'tempy'
import Electron from 'electron'
import { vi, describe, beforeEach, it, afterAll, expect } from 'vitest'
import uuid from 'uuid/v4'

import {
  readDirectoriesWithinDirectory,
  readFilesWithinDirectory,
  parseProtocolDirs,
  addProtocolFile,
  removeProtocolByKey,
  PROTOCOLS_DIRECTORY_NAME,
  PROTOCOLS_DIRECTORY_PATH,
} from '../file-system'
import { analyzeProtocolSource } from '../../protocol-analysis'

vi.mock('uuid/v4')
vi.mock('electron')
vi.mock('electron-store')
vi.mock('../../protocol-analysis')
vi.mock('../../log')

const trashItem = Electron.shell.trashItem

describe('protocol storage directory utilities', () => {
  let protocolsDir: string
  const tempDirs: string[] = []
  const makeEmptyDir = (): string => {
    const dir: string = tempy.directory()
    tempDirs.push(dir)
    return dir
  }
  beforeEach(() => {
    protocolsDir = makeEmptyDir()
    vi.mocked(analyzeProtocolSource).mockReturnValue(Promise.resolve())
  })

  afterAll((): any => {
    vi.resetAllMocks()
    return Promise.all(tempDirs.map(d => fs.remove(d)))
  })

  describe('PROTOCOL DIRECTORY', () => {
    it('constructs PROTOCOLS_DIRECTORY_PATH', () => {
      return expect(PROTOCOLS_DIRECTORY_PATH).toEqual(
        path.join('__mock-app-path__', PROTOCOLS_DIRECTORY_NAME)
      )
    })
  })

  describe('readDirectoriesWithinDirectory', () => {
    it('resolves empty array for empty directory', () => {
      return expect(
        readDirectoriesWithinDirectory(protocolsDir)
      ).resolves.toEqual([])
    })

    it('rejects if directory is not found', () => {
      return expect(
        readDirectoriesWithinDirectory('__not_a_directory__')
      ).rejects.toThrow(/no such file/)
    })

    it('returns paths to all directories in directory', () => {
      const firstProtocolDirName = 'protocol_item_1'
      const secondProtocolDirName = 'protocol_item_2'
      return Promise.all([
        fs.emptyDir(path.join(protocolsDir, firstProtocolDirName)),
        fs.emptyDir(path.join(protocolsDir, secondProtocolDirName)),
      ]).then(() => {
        return expect(
          readDirectoriesWithinDirectory(protocolsDir)
        ).resolves.toEqual([
          path.join(protocolsDir, firstProtocolDirName),
          path.join(protocolsDir, secondProtocolDirName),
        ])
      })
    })
  })

  describe('readFilesWithinDirectory', () => {
    it('resolves empty array for empty directory', () => {
      return expect(readFilesWithinDirectory(protocolsDir)).resolves.toEqual([])
    })

    it('rejects if directory is not found', () => {
      return expect(
        readFilesWithinDirectory('__not_a_directory__')
      ).rejects.toThrow(/no such file/)
    })

    it('returns paths to all files in directory', () => {
      const firstFileName = 'protocol_item_1.py'
      const secondFileName = 'protocol_item_2.py'
      return Promise.all([
        fs.createFile(path.join(protocolsDir, firstFileName)),
        fs.createFile(path.join(protocolsDir, secondFileName)),
      ]).then(() => {
        return expect(readFilesWithinDirectory(protocolsDir)).resolves.toEqual([
          path.join(protocolsDir, firstFileName),
          path.join(protocolsDir, secondFileName),
        ])
      })
    })
  })

  describe('parseProtocolDirs', () => {
    it('reads and parses directories', async () => {
      const protocolsDir = makeEmptyDir()
      const firstProtocolDirName = 'protocol_item_1'
      const secondProtocolDirName = 'protocol_item_2'
      const firstDirPath = path.join(protocolsDir, firstProtocolDirName)
      const secondDirPath = path.join(protocolsDir, secondProtocolDirName)

      await fs.emptyDir(path.join(protocolsDir, firstProtocolDirName))
      await fs.emptyDir(path.join(protocolsDir, firstProtocolDirName, 'src'))
      await fs.emptyDir(
        path.join(protocolsDir, firstProtocolDirName, 'analysis')
      )
      await fs.createFile(
        path.join(protocolsDir, firstProtocolDirName, 'src', 'main.py')
      )
      await fs.createFile(
        path.join(
          protocolsDir,
          firstProtocolDirName,
          'analysis',
          'fake_timestamp0.json'
        )
      )

      await fs.emptyDir(path.join(protocolsDir, secondProtocolDirName))
      await fs.emptyDir(path.join(protocolsDir, secondProtocolDirName, 'src'))
      await fs.emptyDir(
        path.join(protocolsDir, secondProtocolDirName, 'analysis')
      )
      await fs.createFile(
        path.join(protocolsDir, secondProtocolDirName, 'src', 'main.json')
      )
      await fs.createFile(
        path.join(
          protocolsDir,
          secondProtocolDirName,
          'analysis',
          'fake_timestamp1.json'
        )
      )

      const result = await parseProtocolDirs([firstDirPath, secondDirPath])

      expect(result).toEqual([
        {
          dirPath: firstDirPath,
          modified: expect.any(Number),
          srcFilePaths: [path.join(firstDirPath, 'src', 'main.py')],
          analysisFilePaths: [
            path.join(firstDirPath, 'analysis', 'fake_timestamp0.json'),
          ],
        },
        {
          dirPath: secondDirPath,
          modified: expect.any(Number),
          srcFilePaths: [path.join(secondDirPath, 'src', 'main.json')],
          analysisFilePaths: [
            path.join(secondDirPath, 'analysis', 'fake_timestamp1.json'),
          ],
        },
      ])
    })
  })

  describe('addProtocolFile', () => {
    it('writes a protocol file to a new directory', () => {
      let count = 0
      vi.mocked(uuid).mockImplementation(() => {
        const nextId = `${count}abc123`
        count = count + 1
        return nextId
      })
      const sourceDir = makeEmptyDir()
      const destDir = makeEmptyDir()
      const sourceName = path.join(sourceDir, 'source.py')
      const expectedProtocolDirPath = path.join(destDir, '0abc123')

      return fs
        .writeFile(sourceName, 'file contents')
        .then(() => addProtocolFile(sourceName, destDir))
        .then(() => readDirectoriesWithinDirectory(destDir))
        .then(dirPaths => parseProtocolDirs(dirPaths))
        .then(dirs => {
          expect(dirs).toEqual([
            {
              dirPath: expectedProtocolDirPath,
              srcFilePaths: [
                path.join(expectedProtocolDirPath, 'src', 'source.py'),
              ],
              analysisFilePaths: [],
              modified: expect.any(Number),
            },
          ])
        })
    })
  })

  describe('remove protocol dir', () => {
    it('calls Electron.shell.trashItem', () => {
      const protocolsDir = makeEmptyDir()
      const protocolId = 'def456'
      const setup = fs.mkdir(path.join(protocolsDir, protocolId))

      vi.mocked(trashItem).mockResolvedValue()

      return setup
        .then(() => removeProtocolByKey('def456', protocolsDir))
        .then(() => {
          expect(Electron.shell.trashItem).toHaveBeenCalledWith(
            path.join(protocolsDir, 'def456')
          )
        })
    })

    it('deletes the file if Electron fails to trash it', () => {
      const protocolsDir = makeEmptyDir()
      const protocolId = 'def456'
      const setup = fs.mkdir(path.join(protocolsDir, protocolId))

      vi.mocked(trashItem).mockRejectedValue(Error('something went wrong'))

      return setup
        .then(() => removeProtocolByKey('def456', protocolsDir))
        .then(() => readDirectoriesWithinDirectory(protocolsDir))
        .then(files => expect(files).toEqual([]))
    })
  })
})
