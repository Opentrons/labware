import { it, describe, beforeEach, vi, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { COLORS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ChooseEnum } from '../ChooseEnum'

import type { ComponentProps } from 'react'

vi.mocked('../../../../ToasterOven')
const render = (props: ComponentProps<typeof ChooseEnum>) => {
  return renderWithProviders(<ChooseEnum {...props} />, {
    i18nInstance: i18n,
  })
}
describe('ChooseEnum', () => {
  let props: ComponentProps<typeof ChooseEnum>

  beforeEach(() => {
    props = {
      setParameter: vi.fn(),
      handleGoBack: vi.fn(),
      parameter: {
        displayName: 'Default Module Offsets',
        variableName: 'DEFAULT_OFFSETS',
        value: 'none',
        description: '',
        type: 'str',
        choices: [
          {
            displayName: 'no offsets',
            value: 'none',
          },
          {
            displayName: 'temp offset',
            value: '1',
          },
          {
            displayName: 'heater-shaker offset',
            value: '2',
          },
        ],
        default: 'none',
      },
      rawValue: '1',
    }
  })
  it('renders the back icon and calls the prop', () => {
    render(props)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(props.handleGoBack).toHaveBeenCalled()
  })
  it('calls the prop if reset default is clicked when the default has changed', () => {
    render(props)
    fireEvent.click(screen.getByText('Restore default value'))
    expect(props.setParameter).toHaveBeenCalled()
  })
  it('calls does not call prop if reset default is clicked when the default has not changed', () => {
    props = {
      ...props,
      rawValue: 'none',
    }
    render(props)
    fireEvent.click(screen.getByText('Restore default value'))
    expect(props.setParameter).not.toHaveBeenCalled()
  })
  it('should render the text and buttons for choice param', () => {
    render(props)
    screen.getByText('no offsets')
    screen.getByText('temp offset')
    screen.getByText('heater-shaker offset')
    const notSelectedOption = screen.getByRole('label', { name: 'no offsets' })
    const selectedOption = screen.getByRole('label', {
      name: 'temp offset',
    })
    expect(notSelectedOption).toHaveStyle(`background: ${COLORS.blue35}`)
    expect(selectedOption).toHaveStyle(`background: ${COLORS.blue50}`)
  })
})
