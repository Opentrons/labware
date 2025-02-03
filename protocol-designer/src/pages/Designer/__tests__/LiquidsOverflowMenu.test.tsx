import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { getLiquidEntities } from '../../../step-forms/selectors'
import * as labwareIngredActions from '../../../labware-ingred/actions'
import { renderWithProviders } from '../../../__testing-utils__'
import { LiquidsOverflowMenu } from '../LiquidsOverflowMenu'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockLocation = vi.fn()

vi.mock('../../../step-forms/selectors')
vi.mock('../../../labware-ingred/selectors')
vi.mock('../../../labware-ingred/actions')
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useLocation: () => mockLocation,
  }
})

const render = (props: ComponentProps<typeof LiquidsOverflowMenu>) => {
  return renderWithProviders(<LiquidsOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('SlotOverflowMenu', () => {
  let props: ComponentProps<typeof LiquidsOverflowMenu>

  beforeEach(() => {
    props = {
      onClose: vi.fn(),
      showLiquidsModal: vi.fn(),
      overflowWrapperRef: createRef(),
    }
    vi.mocked(getLiquidEntities).mockReturnValue({
      '0': {
        displayColor: 'mockColor',
        displayName: 'mockname',
        liquidGroupId: '0',
        description: null,
        pythonName: 'liquid_1',
      },
    })
  })
  it('renders the overflow buttons with 1 liquid defined', () => {
    render(props)
    screen.getByText('mockname')
    fireEvent.click(screen.getByTestId('mockname_0'))
    expect(props.onClose).toHaveBeenCalled()
    expect(props.showLiquidsModal).toHaveBeenCalled()
    expect(vi.mocked(labwareIngredActions.selectLiquidGroup)).toHaveBeenCalled()
    screen.getByText('Define a liquid')
    fireEvent.click(screen.getByTestId('defineLiquid'))
    expect(props.onClose).toHaveBeenCalled()
    expect(
      vi.mocked(labwareIngredActions.createNewLiquidGroup)
    ).toHaveBeenCalled()
    expect(props.showLiquidsModal).toHaveBeenCalled()
  })
})
