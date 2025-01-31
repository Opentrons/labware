import { MemoryRouter } from 'react-router-dom'
import { describe, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { multiple_tipacks_with_tc } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SetupLabwareList } from '../SetupLabwareList'
import { LabwareListItem } from '../LabwareListItem'

import type { ComponentProps } from 'react'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

vi.mock('../LabwareListItem')

const protocolWithTC = (multiple_tipacks_with_tc as unknown) as CompletedProtocolAnalysis

const render = (props: ComponentProps<typeof SetupLabwareList>) => {
  return renderWithProviders(
    <MemoryRouter>
      <SetupLabwareList {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('SetupLabwareList', () => {
  beforeEach(() => {
    vi.mocked(LabwareListItem).mockReturnValue(
      <div>mock labware list item</div>
    )
  })
  it('renders the correct headers and labware list items', () => {
    render({
      commands: protocolWithTC.commands,
      extraAttentionModules: [],
      attachedModuleInfo: {
        x: 1,
        y: 2,
        z: 3,
        attachedModuleMatch: null,
        moduleId: 'moduleId',
      } as any,
      isFlex: false,
    })

    screen.getAllByText('mock labware list item')
    screen.getByText('Labware name')
    screen.getByText('Location')
  })
})
