import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { ProtocolMetadata } from '../ProtocolMetadata'

import type { ComponentProps } from 'react'

const mockSetShowEditMetadataModal = vi.fn()
const mockMetaDataInfo = [
  {
    description:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
  },
  {
    author: 'Opentrons',
  },
  {
    created: 'June 10, 2024',
  },
  {
    modified: 'September 20, 2024 | 3:44 PM',
  },
] as any

const render = (props: ComponentProps<typeof ProtocolMetadata>) => {
  return renderWithProviders(<ProtocolMetadata {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ProtocolMetadata', () => {
  let props: ComponentProps<typeof ProtocolMetadata>

  beforeEach(() => {
    props = {
      setShowEditMetadataModal: mockSetShowEditMetadataModal,
      metaDataInfo: [],
    }
  })

  it('should render text and button', () => {
    render(props)
    screen.getByText('Protocol Metadata')
    screen.getByText('Edit')
    screen.getByText('Required app version')
    screen.getByText('8.2.0 or higher')
  })

  it('should render protocol metadata', () => {
    props = {
      ...props,
      metaDataInfo: mockMetaDataInfo,
    }
    render(props)
    screen.getByText('Description')
    screen.getByText('Organization/Author')
    screen.getByText('Date created')
    screen.getByText('Last exported')
    screen.getByText('Opentrons')
    screen.getByText(
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'
    )
  })

  it('should call a mock function when clicking edit button', () => {
    render(props)
    fireEvent.click(screen.getByText('Edit'))
    expect(mockSetShowEditMetadataModal).toHaveBeenCalledWith(true)
  })
})
