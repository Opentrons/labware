import * as React from 'react'
import '@testing-library/jest-dom'
import { renderWithProviders } from '@opentrons/components/__utils__'

import { i18n } from '../../../i18n'
import { MetadataCard } from '../MetadataCard'

import * as hooks from '../hooks'

jest.mock('../hooks')
const useProtocolMetadata = hooks.useProtocolMetadata as jest.MockedFunction<
  typeof hooks.useProtocolMetadata
>

describe('MetadataCard', () => {
  let render: () => ReturnType<typeof renderWithProviders>

  beforeEach(() => {
    useProtocolMetadata.mockReturnValue({
      author: 'Anne McLaren',
      lastUpdated: 1624916984418, // epoch time for UTC-4 "Jun 28, 2021, 5:49:44 PM"
      method: 'custom protocol creator application',
      description: 'this describes the protocol',
    })
    render = () => {
      return renderWithProviders(<MetadataCard />, { i18nInstance: i18n })
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders text nodes with prop contents', () => {
    const { getByText } = render()
    expect(
      getByText('Organization/Author').nextElementSibling
    ).toHaveTextContent(/Anne McLaren/i)
    expect(getByText('Last Updated').nextElementSibling).toHaveTextContent(
      /Jun 2[89], 2021, [1-9]?[1-9]:[1-9]9:44 PM/i
    ) // loose check to compensate for different TZ's
    expect(getByText('Creation Method').nextElementSibling).toHaveTextContent(
      /custom protocol creator application/i
    )
    expect(getByText('Description').nextElementSibling).toHaveTextContent(
      /this describes the protocol/i
    )
    expect(
      getByText('Estimated Run Time').nextElementSibling
    ).toHaveTextContent(/-/i)
  })
})
