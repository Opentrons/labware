import * as React from 'react'
import { fireEvent, getByTestId } from '@testing-library/react'
import {
  renderWithProviders,
  SPACING,
  COLORS,
  TYPOGRAPHY,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
} from '@opentrons/components'

import { CheckboxField } from '..'

const render = (props: React.ComponentProps<typeof CheckboxField>) => {
  return renderWithProviders(<CheckboxField {...props} />)[0]
}

describe('CheckboxField', () => {
  let props: React.ComponentProps<typeof CheckboxField>

  beforeEach(() => {
    props = {
      onChange: jest.fn(),
      value: false,
      name: 'mockCheckboxField',
      label: 'checkMockCheckboxField',
      disabled: false,
      isIndeterminate: false,
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders label with correct style', () => {
    const { debug, getByTestId, getByRole, getByText } = render(props)
    // const checkBoxLabel = getByTestId('CheckboxField_label')
    const checkBoxInput = getByRole('checkbox', {
      name: 'checkMockCheckboxField',
    })
    const checkBoxFieldBox = getByText('checkMockCheckboxField')
    const checkBoxIcon = getByTestId('CheckboxField_icon')
    debug()

    // expect(findByTestId('CheckboxField_icon_minus-box')).not.toBeInTheDocument()

    expect(checkBoxIcon).toHaveStyle(`width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`min-width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`color: ${COLORS.darkGreyEnabled}`)
    expect(checkBoxIcon).toHaveStyle(`display: flex`)
    expect(checkBoxIcon).toHaveStyle(`border-radius: ${SPACING.spacingXXS}`)
    expect(checkBoxIcon).toHaveStyle(`justify-content: ${JUSTIFY_CENTER}`)
    expect(checkBoxIcon).toHaveStyle(`align-items: ${ALIGN_CENTER}`)
    // getByLabelText('ot-checkbox')

    // label OUTER_STYLE
    // expect(checkBoxLabel).toHaveStyle('@apply --font-form-default')
    // expect(checkBoxLabel).toHaveStyle('font-size: 0.75rem')
    // expect(checkBoxLabel).toHaveStyle('font-weight: 400')
    // expect(checkBoxLabel).toHaveStyle(`color: ${COLORS.darkBlackEnabled}`)
    // expect(checkBoxLabel).toHaveStyle('display: flex')
    // expect(checkBoxLabel).toHaveStyle(`align-items: ${ALIGN_CENTER}`)
    // expect(checkBoxLabel).toHaveStyle('line-height: 1')

    // input INPUT_STYLE
    expect(checkBoxInput).toHaveStyle(`position: absolute`)
    expect(checkBoxInput).toHaveStyle(`overflow: hidden`)
    expect(checkBoxInput).toHaveStyle(`clip: rect(0 0 0 0)`)
    expect(checkBoxInput).toHaveStyle(`height: ${SPACING.spacingXXS}`)
    expect(checkBoxInput).toHaveStyle(`width: ${SPACING.spacingXXS}`)
    expect(checkBoxInput).toHaveStyle(`margin: -1px`)
    expect(checkBoxInput).toHaveStyle(`padding: 0`)
    expect(checkBoxInput).toHaveStyle(`border: 0`)
    expect(checkBoxInput).toHaveAttribute('tabindex', '0')

    // LABEL_TEXT_STYLE
    expect(checkBoxFieldBox).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
    expect(checkBoxFieldBox).toHaveStyle(
      `font-weight: ${TYPOGRAPHY.fontWeightRegular}`
    )
    expect(checkBoxFieldBox).toHaveStyle(`color: ${COLORS.darkBlackEnabled}`)
    expect(checkBoxFieldBox).toHaveStyle(`flex: 0 0 auto`)

    expect(checkBoxFieldBox).toHaveStyle(
      `padding: ${SPACING.spacing3} ${SPACING.spacing3}`
    )
    expect(checkBoxFieldBox).toHaveAttribute('tabindex', '0')

    // console.log(checkBoxInput)

    // icon part
    // expect(checkBox).toHaveStyle(``)
    // expect(checkBox).toHaveStyle(``)
  })

  it('render icon with correct style - value true', () => {
    props.value = true
    const { getByTestId } = render(props)
    const checkBoxIcon = getByTestId('CheckboxField_icon')
    expect(checkBoxIcon).toHaveStyle(`width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`min-width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`color: ${COLORS.blueEnabled}`)
    expect(checkBoxIcon).toHaveStyle(`display: flex`)
    expect(checkBoxIcon).toHaveStyle(`border-radius: ${SPACING.spacingXXS}`)
    expect(checkBoxIcon).toHaveStyle(`justify-content: ${JUSTIFY_CENTER}`)
    expect(checkBoxIcon).toHaveStyle(`align-items: ${ALIGN_CENTER}`)
  })

  it('render icon with correct style - isIndeterminate true', () => {
    props.isIndeterminate = true
    const { getByTestId } = render(props)
    const checkBoxIcon = getByTestId('CheckboxField_icon_minus-box')
    expect(checkBoxIcon).toHaveStyle(`width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`min-width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`color: ${COLORS.blueEnabled}`)
    expect(checkBoxIcon).toHaveStyle(`display: flex`)
    expect(checkBoxIcon).toHaveStyle(`border-radius: ${SPACING.spacingXXS}`)
    expect(checkBoxIcon).toHaveStyle(`justify-content: ${JUSTIFY_CENTER}`)
    expect(checkBoxIcon).toHaveStyle(`align-items: ${ALIGN_CENTER}`)
  })

  it('renders label with correct style - value undefine', () => {
    props.value = undefined
    const { getByTestId } = render(props)
    const checkBoxIcon = getByTestId('CheckboxField_icon')
    expect(checkBoxIcon).toHaveStyle(`width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`min-width: ${SPACING.spacingM}`)
    expect(checkBoxIcon).toHaveStyle(`color: ${COLORS.darkGreyEnabled}`)
    expect(checkBoxIcon).toHaveStyle(`display: flex`)
    expect(checkBoxIcon).toHaveStyle(`border-radius: ${SPACING.spacingXXS}`)
    expect(checkBoxIcon).toHaveStyle(`justify-content: ${JUSTIFY_CENTER}`)
    expect(checkBoxIcon).toHaveStyle(`align-items: ${ALIGN_CENTER}`)
  })

  it('renders label with correct style - disabled true', () => {
    props.disabled = true
    const { getByRole } = render(props)
    const checkBoxInput = getByRole('checkbox', {
      name: 'checkMockCheckboxField',
    })
    expect(checkBoxInput).toBeDisabled()
  })

  it('renders label with correct style - tabIndex 1', () => {
    props.tabIndex = 1
    const { getByRole, getByText } = render(props)
    const checkBoxInput = getByRole('checkbox', {
      name: 'checkMockCheckboxField',
    })
    const checkBoxFieldBox = getByText('checkMockCheckboxField')
    expect(checkBoxInput).toHaveAttribute('tabindex', '1')
    expect(checkBoxFieldBox).toHaveAttribute('tabindex', '1')
  })

  it('calls mock function when clicking checkboxfield', () => {
    const { getByRole } = render(props)
    const checkBoxInput = getByRole('checkbox', {
      name: 'checkMockCheckboxField',
    })
    fireEvent.click(checkBoxInput)
    expect(props.onChange).toHaveBeenCalled()
  })
})

// q1 label OUT_STYLE
// q2 icon name
