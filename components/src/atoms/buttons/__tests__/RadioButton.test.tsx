import '@testing-library/jest-dom/vitest'
import { screen, queryByAttribute } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../testing/utils'
import { COLORS } from '../../../helix-design-system'
import { SPACING } from '../../../ui-style-constants'
import { RadioButton } from '../RadioButton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof RadioButton>) => {
  return renderWithProviders(<RadioButton {...props} />)[0]
}

describe('RadioButton', () => {
  let props: ComponentProps<typeof RadioButton>
  beforeEach(() => {
    props = {
      onChange: vi.fn(),
      buttonLabel: 'radio button',
      buttonValue: 1,
    }
  })

  it('renders the large button', () => {
    props = {
      ...props,
      radioButtonType: 'large',
    }
    render(props)
    const label = screen.getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.blue35}`)
    expect(label).toHaveStyle(
      `padding: ${SPACING.spacing12} ${SPACING.spacing16}`
    )
  })

  it('renders the large selected button', () => {
    props = {
      ...props,
      isSelected: true,
      radioButtonType: 'large',
    }
    render(props)
    const label = screen.getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(label).toHaveStyle(
      `padding: ${SPACING.spacing12} ${SPACING.spacing16}`
    )
  })

  it('renders the small button with an icon', () => {
    props = {
      ...props,
      radioButtonType: 'small',
      iconName: 'alert-circle',
    }
    render(props)
    const label = screen.getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.blue35}`)
    expect(label).toHaveStyle(
      `padding: ${SPACING.spacing12} ${SPACING.spacing16}`
    )
  })

  it('renders the small selected button', () => {
    props = {
      ...props,
      isSelected: true,
      radioButtonType: 'small',
    }
    render(props)
    const label = screen.getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(label).toHaveStyle(
      `padding: ${SPACING.spacing12} ${SPACING.spacing16}`
    )
  })

  it('renders id instead of buttonLabel when id is set', () => {
    props = {
      ...props,
      id: 'mock-radio-button-id',
    }
    render(props)
    const getById = queryByAttribute.bind(null, 'id')
    const idRadioButton = getById(
      render(props).container,
      'mock-radio-button-id'
    )
    expect(idRadioButton).toBeInTheDocument()
    const buttonLabelIdRadioButton = getById(
      render(props).container,
      //  @ts-expect-error(ja, 8/23/24): buttonLabel is a string type
      props.buttonLabel
    )
    expect(buttonLabelIdRadioButton).not.toBeInTheDocument()
  })
})
