import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockDefinition } from '/app/redux/custom-labware/__fixtures__'
import { labwareImages } from '../labware-images'
import { Gallery } from '../Gallery'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Gallery>) => {
  return renderWithProviders(<Gallery {...props} />)
}

describe('Gallery', () => {
  let props: ComponentProps<typeof Gallery>
  beforeEach(() => {
    labwareImages.mock_definition = ['image1']
    props = {
      definition: mockDefinition,
    }
  })

  it('renders one main SVG and no mini images if definition contains no images', () => {
    labwareImages.mock_definition = []
    render(props)

    screen.getByTestId('gallery_main_svg')
    expect(screen.queryAllByTestId('gallery_mini_image')).toHaveLength(0)
  })

  it('renders one main SVG and two mini images if definition contains one image', () => {
    render(props)

    screen.getByTestId('gallery_main_svg')
    expect(screen.queryAllByTestId('gallery_mini_image')).toHaveLength(2)
  })

  it('renders image in main image when mini image is clicked', () => {
    render(props)
    let images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    const miniImages = screen.queryAllByTestId('gallery_mini_image')
    fireEvent.click(miniImages[1])
    images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
  })

  it('renders one main SVG and three mini images if definition contains two images', () => {
    labwareImages.mock_definition = ['image1', 'image2']
    render(props)
    screen.getByTestId('gallery_main_svg')
    expect(screen.queryAllByTestId('gallery_mini_image')).toHaveLength(3)
  })
})
