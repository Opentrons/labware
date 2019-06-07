import fixture12Trough from '@opentrons/shared-data/labware/fixtures/2/fixture12Trough.json'
import fixture96Plate from '@opentrons/shared-data/labware/fixtures/2/fixture96Plate.json'
import fixture384Plate from '@opentrons/shared-data/labware/fixtures/2/fixture384Plate.json'
import { getWellSetForMultichannel } from '../utils'

describe('getWellSetForMultichannel (integration test)', () => {
  test('96-flat', () => {
    const labware = fixture96Plate
    expect(getWellSetForMultichannel(labware, 'A1')).toEqual([
      'A1',
      'B1',
      'C1',
      'D1',
      'E1',
      'F1',
      'G1',
      'H1',
    ])

    expect(getWellSetForMultichannel(labware, 'B1')).toEqual([
      'A1',
      'B1',
      'C1',
      'D1',
      'E1',
      'F1',
      'G1',
      'H1',
    ])

    expect(getWellSetForMultichannel(labware, 'H1')).toEqual([
      'A1',
      'B1',
      'C1',
      'D1',
      'E1',
      'F1',
      'G1',
      'H1',
    ])

    expect(getWellSetForMultichannel(labware, 'A2')).toEqual([
      'A2',
      'B2',
      'C2',
      'D2',
      'E2',
      'F2',
      'G2',
      'H2',
    ])
  })

  test('invalid well', () => {
    const labware = fixture96Plate
    expect(getWellSetForMultichannel(labware, 'A13')).toBeFalsy()
  })

  test('trough-12row', () => {
    const labware = fixture12Trough
    expect(getWellSetForMultichannel(labware, 'A1')).toEqual([
      'A1',
      'A1',
      'A1',
      'A1',
      'A1',
      'A1',
      'A1',
      'A1',
    ])

    expect(getWellSetForMultichannel(labware, 'A2')).toEqual([
      'A2',
      'A2',
      'A2',
      'A2',
      'A2',
      'A2',
      'A2',
      'A2',
    ])
  })

  test('384-plate', () => {
    const labware = fixture384Plate
    expect(getWellSetForMultichannel(labware, 'C1')).toEqual([
      'A1',
      'C1',
      'E1',
      'G1',
      'I1',
      'K1',
      'M1',
      'O1',
    ])

    expect(getWellSetForMultichannel(labware, 'F2')).toEqual([
      'B2',
      'D2',
      'F2',
      'H2',
      'J2',
      'L2',
      'N2',
      'P2',
    ])
  })
})
