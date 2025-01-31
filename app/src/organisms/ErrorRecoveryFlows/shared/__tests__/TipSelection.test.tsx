import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { TipSelection } from '../TipSelection'
import { WellSelection } from '../../../WellSelection'

import type { ComponentProps } from 'react'

vi.mock('../../../WellSelection')

const render = (props: ComponentProps<typeof TipSelection>) => {
  return renderWithProviders(<TipSelection {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TipSelection', () => {
  let props: ComponentProps<typeof TipSelection>
  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      allowTipSelection: true,
      failedPipetteUtils: {
        failedPipetteInfo: { data: { channels: 8 } } as any,
      } as any,
    }

    vi.mocked(WellSelection).mockReturnValue(<div>MOCK WELL SELECTION</div>)
  })

  it('renders the WellSelection component with the correct props', () => {
    render(props)

    expect(screen.getByText('MOCK WELL SELECTION')).toBeInTheDocument()
    expect(vi.mocked(WellSelection)).toHaveBeenCalledWith(
      expect.objectContaining({
        definition: props.failedLabwareUtils.tipSelectorDef,
        selectedPrimaryWells: props.failedLabwareUtils.selectedTipLocations,
        channels:
          props.failedPipetteUtils.failedPipetteInfo?.data.channels ?? 1,
        allowSelect: props.allowTipSelection,
        pipetteNozzleDetails: undefined,
      }),
      {}
    )
  })
})
