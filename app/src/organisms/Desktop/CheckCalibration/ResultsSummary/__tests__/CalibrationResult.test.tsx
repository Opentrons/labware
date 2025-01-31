import { vi, it, describe, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RenderResult } from '../RenderResult'
import { CalibrationResult } from '../CalibrationResult'

import type { ComponentProps } from 'react'

vi.mock('../RenderResult')

const render = (props: ComponentProps<typeof CalibrationResult>) => {
  return renderWithProviders(<CalibrationResult {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('PipetteCalibrationResult', () => {
  let props: ComponentProps<typeof CalibrationResult>

  beforeEach(() => {
    props = {
      calType: 'pipetteOffset',
      isBadCal: false,
    }
    vi.mocked(RenderResult).mockReturnValue(<div>render result</div>)
  })

  it('should render pipette offset calibration title and RenderResult - isBadCal: false', () => {
    render(props)
    screen.getByText('pipette offset calibration')
    screen.getByText('render result')
  })

  it('should render pipette offset calibration title and RenderResult - isBadCal: true', () => {
    props.isBadCal = true
    render(props)
    screen.getByText('pipette offset calibration')
    screen.getByText('render result')
  })

  it('should render tip length calibration title and RenderResult - isBadCal: false', () => {
    props.calType = 'tipLength'
    render(props)
    screen.getByText('tip length calibration')
    screen.getByText('render result')
  })

  it('should render tip length calibration title and RenderResult - isBadCal: true', () => {
    props.calType = 'tipLength'
    props.isBadCal = true
    render(props)
    screen.getByText('tip length calibration')
    screen.getByText('render result')
  })

  it('should render deck calibration title and RenderResult - isBadCal: false', () => {
    props.calType = 'deck'
    render(props)
    screen.getByText('Deck Calibration')
    screen.getByText('render result')
  })

  it('should render deck calibration title and RenderResult - isBadCal: true', () => {
    props.calType = 'deck'
    props.isBadCal = true
    render(props)
    screen.getByText('Deck Calibration')
    screen.getByText('render result')
  })
})
