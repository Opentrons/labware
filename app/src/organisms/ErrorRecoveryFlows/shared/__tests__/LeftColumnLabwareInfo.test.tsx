import { describe, it, beforeEach, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockRecoveryContentProps } from '../../__fixtures__'
import { i18n } from '/app/i18n'
import { LeftColumnLabwareInfo } from '../LeftColumnLabwareInfo'
import { InterventionContent } from '/app/molecules/InterventionModal/InterventionContent'

import type { ComponentProps } from 'react'

vi.mock('/app/molecules/InterventionModal/InterventionContent')

const render = (props: ComponentProps<typeof LeftColumnLabwareInfo>) => {
  return renderWithProviders(<LeftColumnLabwareInfo {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('LeftColumnLabwareInfo', () => {
  let props: ComponentProps<typeof LeftColumnLabwareInfo>

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      title: 'MOCK_TITLE',
      failedLabwareUtils: {
        failedLabwareName: 'MOCK_LW_NAME',
        failedLabwareNickname: 'MOCK_LW_NICKNAME',
        failedLabwareLocations: {
          displayNameCurrentLoc: 'slot A1',
          displayNameNewLoc: 'slot B2',
        },
      } as any,
      type: 'location',
      bannerText: 'MOCK_BANNER_TEXT',
    }

    vi.mocked(InterventionContent).mockReturnValue(
      <div>MOCK_INTERVENTION_CONTENT</div>
    )
  })

  it('renders the InterventionContent component with correct props', () => {
    render(props)

    screen.getByText('MOCK_INTERVENTION_CONTENT')
    expect(vi.mocked(InterventionContent)).toHaveBeenCalledWith(
      expect.objectContaining({
        headline: 'MOCK_TITLE',
        infoProps: {
          type: 'location',
          labwareName: 'MOCK_LW_NAME',
          labwareNickname: 'MOCK_LW_NICKNAME',
          currentLocationProps: { deckLabel: 'SLOT A1' },
          newLocationProps: { deckLabel: 'SLOT B2' },
        },
        notificationProps: {
          type: 'alert',
          heading: 'MOCK_BANNER_TEXT',
        },
      }),
      {}
    )
  })

  it('does not include notificationProps when bannerText is not provided', () => {
    props.bannerText = undefined
    render(props)

    expect(vi.mocked(InterventionContent)).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationProps: undefined,
      }),
      {}
    )
  })

  it('does not include newLocationProps when newLoc is not provided', () => {
    props.failedLabwareUtils.failedLabwareLocations.displayNameNewLoc = null
    render(props)

    expect(vi.mocked(InterventionContent)).toHaveBeenCalledWith(
      expect.objectContaining({
        infoProps: expect.not.objectContaining({
          newLocationProps: expect.anything(),
        }),
      }),
      {}
    )
  })

  it('converts location labels to uppercase', () => {
    props.failedLabwareUtils.failedLabwareLocations = {
      displayNameCurrentLoc: 'slot A1',
      displayNameNewLoc: 'slot B2',
      newLoc: {} as any,
      currentLoc: {} as any,
    }

    render(props)

    expect(vi.mocked(InterventionContent)).toHaveBeenCalledWith(
      expect.objectContaining({
        infoProps: expect.objectContaining({
          currentLocationProps: { deckLabel: 'SLOT A1' },
          newLocationProps: { deckLabel: 'SLOT B2' },
        }),
      }),
      {}
    )
  })
})
