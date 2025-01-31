import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { BORDERS, COLORS } from '../../../helix-design-system'
import { SPACING } from '../../../ui-style-constants'
import { renderWithProviders } from '../../../testing/utils'
import { Chip } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Chip>) => {
  return renderWithProviders(<Chip {...props} />)
}

describe('Chip Touchscreen', () => {
  let props: ComponentProps<typeof Chip>

  it('should render text, icon, bgcolor with success colors', () => {
    props = {
      text: 'mockSuccess',
      type: 'success',
    }
    render(props)
    const chip = screen.getByTestId('Chip_success')
    const chipText = screen.getByText('mockSuccess')
    expect(chip).toHaveStyle(`background-color: ${COLORS.green35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.green60}`)
    const icon = screen.getByLabelText('icon_mockSuccess')
    expect(icon).toHaveStyle(`color: ${COLORS.green60}`)
    // ToDo (kk:03/28/2024) seems that jsdom doesn't support switching via media query
    // I will keep investigating this
    // expect(icon).toHaveStyle(`width: 1.5rem`)
  })

  it('should render text, icon, no bgcolor with success colors and bg false', () => {
    props = {
      background: false,
      text: 'mockSuccess',
      type: 'success',
    }
    render(props)
    const chip = screen.getByTestId('Chip_success')
    const chipText = screen.getByText('mockSuccess')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.green60}`)
    const icon = screen.getByLabelText('icon_mockSuccess')
    expect(icon).toHaveStyle(`color: ${COLORS.green60}`)
  })

  it('should render text, icon, bgcolor with warning colors', () => {
    props = {
      text: 'mockWarning',
      type: 'warning',
    }
    render(props)
    const chip = screen.getByTestId('Chip_warning')
    const chipText = screen.getByText('mockWarning')
    expect(chip).toHaveStyle(`background-color: ${COLORS.yellow35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.yellow60}`)
    const icon = screen.getByLabelText('icon_mockWarning')
    expect(icon).toHaveStyle(`color: ${COLORS.yellow60}`)
  })

  it('should render text, icon, no bgcolor with warning colors and bg false', () => {
    props = {
      background: false,
      text: 'mockWarning',
      type: 'warning',
    }
    render(props)
    const chip = screen.getByTestId('Chip_warning')
    const chipText = screen.getByText('mockWarning')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.yellow60}`)
    const icon = screen.getByLabelText('icon_mockWarning')
    expect(icon).toHaveStyle(`color: ${COLORS.yellow60}`)
  })

  it('should render text, icon, bgcolor with neutral colors', () => {
    props = {
      text: 'mockNeutral',
      type: 'neutral',
    }
    render(props)
    const chip = screen.getByTestId('Chip_neutral')
    const chipText = screen.getByText('mockNeutral')
    expect(chip).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity20HexCode}`
    )
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    const icon = screen.getByLabelText('icon_mockNeutral')
    expect(icon).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('should render text, icon, no bgcolor with neutral colors and bg false', () => {
    props = {
      background: false,
      text: 'mockNeutral',
      type: 'neutral',
    }
    render(props)
    const chip = screen.getByTestId('Chip_neutral')
    const chipText = screen.getByText('mockNeutral')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    const icon = screen.getByLabelText('icon_mockNeutral')
    expect(icon).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('should render text, icon, bgcolor with error colors', () => {
    props = {
      text: 'mockError',
      type: 'error',
    }
    render(props)
    const chip = screen.getByTestId('Chip_error')
    const chipText = screen.getByText('mockError')
    expect(chip).toHaveStyle(`background-color: ${COLORS.red35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.red60}`)
    const icon = screen.getByLabelText('icon_mockError')
    expect(icon).toHaveStyle(`color: ${COLORS.red60}`)
  })

  it('should render text, icon, no bgcolor with error colors and bg false', () => {
    props = {
      background: false,
      text: 'mockError',
      type: 'error',
    }
    render(props)
    const chip = screen.getByTestId('Chip_error')
    const chipText = screen.getByText('mockError')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.red60}`)
    const icon = screen.getByLabelText('icon_mockError')
    expect(icon).toHaveStyle(`color: ${COLORS.red60}`)
  })

  it('should render text, icon, bgcolor with info colors', () => {
    props = {
      text: 'mockInfo',
      type: 'info',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    const chipText = screen.getByText('mockInfo')
    expect(chip).toHaveStyle(`background-color: ${COLORS.blue35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.blue60}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`color: ${COLORS.blue60}`)
  })

  it('should render text, icon, no bgcolor with info colors and bg false', () => {
    props = {
      background: false,
      text: 'mockInfo',
      type: 'info',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    const chipText = screen.getByText('mockInfo')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.blue60}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`color: ${COLORS.blue60}`)
  })
  it('renders no icon when hasIcon is false', () => {
    props = {
      text: 'mockInfo',
      hasIcon: false,
      type: 'info',
    }
    render(props)
    expect(screen.queryByText('icon_mockInfo')).not.toBeInTheDocument()
  })

  it('render text with smaller padding and smaller icon when chip size is small and background is false', () => {
    props = {
      background: false,
      text: 'mockInfo',
      type: 'info',
      chipSize: 'small',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    expect(chip).toHaveStyle(`padding: ${SPACING.spacing4} 0`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`width: 0.75rem`)
  })

  // ToDo (kk:03/28/2024) seems that jsdom doesn't support switching via media query
  // I will keep investigating this
  // it('render text with smaller padding and smaller icon when chip size is small and background is true', () => {
  //   props = {
  //     background: true,
  //     text: 'mockInfo',
  //     type: 'info',
  //     chipSize: 'small',
  //   }
  //   render(props)
  //   const chip = screen.getByTestId('Chip_info')
  //   expect(chip).toHaveStyle(`padding: ${SPACING.spacing4} ${SPACING.spacing8}`)
  //   const icon = screen.getByLabelText('icon_mockInfo')
  //   expect(icon).toHaveStyle(`width: 1.25rem`)
  // })
})

describe('Chip Web', () => {
  let props: ComponentProps<typeof Chip>

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })
  it('should render text, icon, bgcolor with success colors', () => {
    props = {
      text: 'mockSuccess',
      type: 'success',
    }
    render(props)
    const chip = screen.getByTestId('Chip_success')
    const chipText = screen.getByText('mockSuccess')
    expect(chip).toHaveStyle(`background-color: ${COLORS.green35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.green60}`)
    // expect(chipText).toHaveStyle(
    //   `padding: ${SPACING.spacing2} ${SPACING.spacing8}`
    // )
    const icon = screen.getByLabelText('icon_mockSuccess')
    expect(icon).toHaveStyle(`color: ${COLORS.green60}`)
    expect(icon).toHaveStyle(`width: 1rem`)
  })

  it('should render text, icon, no bgcolor with success colors and bg false', () => {
    props = {
      background: false,
      text: 'mockSuccess',
      type: 'success',
    }
    render(props)
    const chip = screen.getByTestId('Chip_success')
    const chipText = screen.getByText('mockSuccess')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.green60}`)
    const icon = screen.getByLabelText('icon_mockSuccess')
    expect(icon).toHaveStyle(`color: ${COLORS.green60}`)
  })

  it('should render text, icon, bgcolor with warning colors', () => {
    props = {
      text: 'mockWarning',
      type: 'warning',
    }
    render(props)
    const chip = screen.getByTestId('Chip_warning')
    const chipText = screen.getByText('mockWarning')
    expect(chip).toHaveStyle(`background-color: ${COLORS.yellow35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.yellow60}`)
    const icon = screen.getByLabelText('icon_mockWarning')
    expect(icon).toHaveStyle(`color: ${COLORS.yellow60}`)
  })

  it('should render text, icon, no bgcolor with warning colors and bg false', () => {
    props = {
      background: false,
      text: 'mockWarning',
      type: 'warning',
    }
    render(props)
    const chip = screen.getByTestId('Chip_warning')
    const chipText = screen.getByText('mockWarning')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.yellow60}`)
    const icon = screen.getByLabelText('icon_mockWarning')
    expect(icon).toHaveStyle(`color: ${COLORS.yellow60}`)
  })

  it('should render text, icon, bgcolor with neutral colors', () => {
    props = {
      text: 'mockNeutral',
      type: 'neutral',
    }
    render(props)
    const chip = screen.getByTestId('Chip_neutral')
    const chipText = screen.getByText('mockNeutral')
    expect(chip).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity20HexCode}`
    )
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    const icon = screen.getByLabelText('icon_mockNeutral')
    expect(icon).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('should render text, icon, no bgcolor with neutral colors and bg false', () => {
    props = {
      background: false,
      text: 'mockNeutral',
      type: 'neutral',
    }
    render(props)
    const chip = screen.getByTestId('Chip_neutral')
    const chipText = screen.getByText('mockNeutral')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    const icon = screen.getByLabelText('icon_mockNeutral')
    expect(icon).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('should render text, icon, bgcolor with error colors', () => {
    props = {
      text: 'mockError',
      type: 'error',
    }
    render(props)
    const chip = screen.getByTestId('Chip_error')
    const chipText = screen.getByText('mockError')
    expect(chip).toHaveStyle(`background-color: ${COLORS.red35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.red60}`)
    const icon = screen.getByLabelText('icon_mockError')
    expect(icon).toHaveStyle(`color: ${COLORS.red60}`)
  })

  it('should render text, icon, no bgcolor with error colors and bg false', () => {
    props = {
      background: false,
      text: 'mockError',
      type: 'error',
    }
    render(props)
    const chip = screen.getByTestId('Chip_error')
    const chipText = screen.getByText('mockError')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.red60}`)
    const icon = screen.getByLabelText('icon_mockError')
    expect(icon).toHaveStyle(`color: ${COLORS.red60}`)
  })

  it('should render text, icon, bgcolor with info colors', () => {
    props = {
      text: 'mockInfo',
      type: 'info',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    const chipText = screen.getByText('mockInfo')
    expect(chip).toHaveStyle(`background-color: ${COLORS.blue35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.blue60}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`color: ${COLORS.blue60}`)
  })

  it('should render text, icon, no bgcolor with info colors and bg false', () => {
    props = {
      background: false,
      text: 'mockInfo',
      type: 'info',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    const chipText = screen.getByText('mockInfo')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.blue60}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`color: ${COLORS.blue60}`)
  })
  it('renders no icon when hasIcon is false', () => {
    props = {
      text: 'mockInfo',
      hasIcon: false,
      type: 'info',
    }
    render(props)
    expect(screen.queryByText('icon_mockInfo')).not.toBeInTheDocument()
  })

  it('render text with smaller padding and smaller icon when chip size is small and background is false', () => {
    props = {
      background: false,
      text: 'mockInfo',
      type: 'info',
      chipSize: 'small',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    expect(chip).toHaveStyle(`padding: ${SPACING.spacing4} 0`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`width: 0.75rem`)
  })

  it('render text with smaller padding and smaller icon when chip size is small and background is true', () => {
    props = {
      background: true,
      text: 'mockInfo',
      type: 'info',
      chipSize: 'small',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    expect(chip).toHaveStyle(`padding: ${SPACING.spacing4} ${SPACING.spacing6}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`width: 0.75rem`)
  })
})
