import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { COLORS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { Skeleton } from '/app/atoms/Skeleton'
import { getIsOnDevice } from '/app/redux/config'
import { SimpleWizardBody } from '..'

import type { ComponentProps } from 'react'

vi.mock('/app/atoms/Skeleton')
vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof SimpleWizardBody>) => {
  return renderWithProviders(<SimpleWizardBody {...props} />)[0]
}
describe('SimpleWizardBody', () => {
  let props: ComponentProps<typeof SimpleWizardBody>
  beforeEach(() => {
    props = {
      iconColor: COLORS.red60,
      children: <div>children</div>,
      header: 'header',
      subHeader: 'subheader',
      isSuccess: false,
    }
    vi.mocked(getIsOnDevice).mockReturnValue(false)
  })
  it('renders the correct information when it is not success', () => {
    render(props)
    screen.getByText('header')
    screen.getByText('subheader')
    screen.getByLabelText('ot-alert')
  })
  it('renders the correct information for on device display', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByText('header')
    screen.getByText('subheader')
    screen.getByLabelText('ot-alert')
  })
  it('renders the correct information when it is success', () => {
    props = {
      ...props,
      isSuccess: true,
    }
    render(props)
    screen.getByText('header')
    screen.getByText('subheader')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
  })
  it('renders a few skeletons  when it is pending', () => {
    props = {
      ...props,
      isPending: true,
    }
    vi.mocked(Skeleton).mockReturnValue(<div>mock skeleton</div>)
    render(props)
    screen.getAllByText('mock skeleton')
  })
})
