import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { getLabwareDefsByURI } from '../../../labware-defs/selectors'
import { PipetteInfoItem } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../labware-defs/selectors')

const render = (props: ComponentProps<typeof PipetteInfoItem>) => {
  return renderWithProviders(<PipetteInfoItem {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('PipetteInfoItem', () => {
  let props: ComponentProps<typeof PipetteInfoItem>

  beforeEach(() => {
    props = {
      editClick: vi.fn(),
      cleanForm: vi.fn(),
      tiprackDefURIs: ['mockDefUri'],
      pipetteName: 'p1000_single',
      mount: 'left',
    }

    vi.mocked(getLabwareDefsByURI).mockReturnValue({
      mockDefUri: { metadata: { displayName: 'mock display name' } } as any,
    })
  })
  it('renders pipette with edit and remove buttons', () => {
    render(props)
    screen.getByText('P1000 Single-Channel GEN1')
    screen.getByText('Left Mount')
    screen.getByText('mock display name')
    fireEvent.click(screen.getByText('Edit'))
    expect(props.editClick).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Remove'))
    expect(props.cleanForm).toHaveBeenCalled()
  })

  it('renders pipette with edit and remove buttons right pipette', () => {
    props = {
      ...props,
      mount: 'right',
    }
    render(props)
    screen.getByText('P1000 Single-Channel GEN1')
    screen.getByText('Right Mount')
    screen.getByText('mock display name')
    fireEvent.click(screen.getByText('Edit'))
    expect(props.editClick).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Remove'))
    expect(props.cleanForm).toHaveBeenCalled()
  })
})
