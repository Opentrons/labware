import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { FileUpload } from '..'
import testFile from './test-file.png'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof FileUpload>) => {
  return renderWithProviders(<FileUpload {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const handleClick = vi.fn()

describe('FileUpload', () => {
  let props: ComponentProps<typeof FileUpload>

  beforeEach(() => {
    const file = new File([testFile], 'a-file-to-test.png')

    props = {
      file,
      fileError: null,
      handleClick,
    }
  })
  it('renders file upload', () => {
    render(props)
    screen.getByText('a-file-to-test.png')
    const removeFile = screen.getByLabelText('remove_file')
    removeFile.click()
    expect(handleClick).toBeCalled()
  })

  it('renders file upload error', () => {
    render({ ...props, fileError: 'oops this is a bad file' })
    screen.getByText('oops this is a bad file')
  })
})
