import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { fixtureTiprack300ul as _fixtureTiprack300ul } from '@opentrons/shared-data'
import { renderWithProviders } from '../../../testing/utils'
import { RobotCoordsForeignDiv } from '../../Deck/RobotCoordsForeignDiv'
import { PipetteRender } from '../PipetteRender'
import { EmanatingNozzle } from '../EmanatingNozzle'
import { EightEmanatingNozzles } from '../EightEmanatingNozzles'
import {
  SINGLE_CHANNEL_PIPETTE_WIDTH,
  SINGLE_CHANNEL_PIPETTE_HEIGHT,
  MULTI_CHANNEL_PIPETTE_WIDTH,
  MULTI_CHANNEL_PIPETTE_HEIGHT,
} from '../constants'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../../Deck/RobotCoordsForeignDiv')
vi.mock('../EmanatingNozzle')
vi.mock('../EightEmanatingNozzles')

const fixtureTiprack300Ul = _fixtureTiprack300ul as LabwareDefinition2

const render = (props: ComponentProps<typeof PipetteRender>) => {
  return renderWithProviders(<PipetteRender {...props} />)[0]
}

describe('PipetteRender', () => {
  let props: ComponentProps<typeof PipetteRender>
  beforeEach(() => {
    props = {
      labwareDef: fixtureTiprack300Ul,
      pipetteName: 'p1000_single',
    }
    vi.mocked(RobotCoordsForeignDiv).mockReturnValue(<div></div>)
  })

  describe('when the pipette is single channel', () => {
    beforeEach(() => {
      vi.mocked(RobotCoordsForeignDiv).mockImplementation(({ children }) => (
        <div>
          {`rectangle with width ${SINGLE_CHANNEL_PIPETTE_WIDTH} and height ${SINGLE_CHANNEL_PIPETTE_HEIGHT}`}{' '}
          {children}
        </div>
      ))

      vi.mocked(EmanatingNozzle).mockReturnValue(
        <div>mock emanating nozzle</div>
      )
    })

    it('should render a rectangle with the correct dimensions', () => {
      render(props)
      screen.getByText(
        `rectangle with width ${SINGLE_CHANNEL_PIPETTE_WIDTH} and height ${SINGLE_CHANNEL_PIPETTE_HEIGHT}`
      )
      vi.mocked(EmanatingNozzle).mockRestore()
    })
    it('should render a single emanating nozzle', () => {
      render(props)
      screen.getByText('mock emanating nozzle')
      expect(EightEmanatingNozzles).not.toHaveBeenCalled()
    })
  })
  describe('when the pipette is 8 channel', () => {
    beforeEach(() => {
      vi.mocked(RobotCoordsForeignDiv).mockImplementation(({ children }) => (
        <div>
          {`rectangle with width ${MULTI_CHANNEL_PIPETTE_WIDTH} and height ${MULTI_CHANNEL_PIPETTE_HEIGHT}`}{' '}
          {children}
        </div>
      ))

      vi.mocked(EightEmanatingNozzles).mockReturnValue(
        <div>mock eight emanating nozzles</div>
      )
    })
    it('should render a rectangle with the correct dimensions', () => {
      props = {
        ...props,
        pipetteName: 'p10_multi',
      }
      render(props)
      screen.getByText(
        `rectangle with width ${MULTI_CHANNEL_PIPETTE_WIDTH} and height ${MULTI_CHANNEL_PIPETTE_HEIGHT}`
      )
      vi.mocked(EightEmanatingNozzles).mockRestore()
    })
    it('should render eight emanating nozzles', () => {
      props = {
        ...props,
        pipetteName: 'p10_multi',
      }
      render(props)
      screen.getByText('mock eight emanating nozzles')
    })
  })
})
