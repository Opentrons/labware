import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockDropTipWizardContainerProps } from '../__fixtures__'
import {
  useWizardExitHeader,
  DropTipWizardHeader,
} from '../DropTipWizardHeader'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type { UseWizardExitHeaderProps } from '../DropTipWizardHeader'

const render = (props: ComponentProps<typeof DropTipWizardHeader>) => {
  return renderWithProviders(<DropTipWizardHeader {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('DropTipWizardHeader', () => {
  let props: ComponentProps<typeof DropTipWizardHeader>

  beforeEach(() => {
    props = mockDropTipWizardContainerProps
  })

  it('renders appropriate copy and onClick behavior', () => {
    render(props)
    screen.getByText('Drop tips')
  })
})

describe('useWizardExitHeader', () => {
  let props: UseWizardExitHeaderProps
  let mockHandleCleanUpAndClose: Mock
  let mockConfirmExit: Mock

  beforeEach(() => {
    mockHandleCleanUpAndClose = vi.fn()
    mockConfirmExit = vi.fn()

    props = {
      isFinalStep: true,
      hasInitiatedExit: false,
      errorDetails: null,
      handleCleanUpAndClose: mockHandleCleanUpAndClose,
      confirmExit: mockConfirmExit,
    }
  })

  it('should appropriately return handleCleanUpAndClose', () => {
    const handleExit = useWizardExitHeader(props)
    expect(handleExit).toEqual(props.handleCleanUpAndClose)
  })

  it('should appropriately return confirmExit', () => {
    props = { ...props, isFinalStep: false }
    const handleExit = useWizardExitHeader(props)
    expect(handleExit).toEqual(props.confirmExit)
  })

  it('should appropriately return handleCleanUpAndClose with homeOnError = false', () => {
    const errorDetails = { message: 'Some error occurred' }
    const modifiedProps = { ...props, errorDetails }
    const handleExit = useWizardExitHeader(modifiedProps)
    expect(mockHandleCleanUpAndClose.mock.calls.length).toBe(0)
    handleExit()
    expect(mockHandleCleanUpAndClose).toHaveBeenCalledWith(false)
  })

  it('should appropriately return a function that does nothing ', () => {
    const modifiedProps = { ...props, hasInitiatedExit: true }
    const handleExit = useWizardExitHeader(modifiedProps)
    handleExit()
    expect(mockHandleCleanUpAndClose.mock.calls.length).toBe(0)
    expect(mockConfirmExit.mock.calls.length).toBe(0)
  })
})
