import * as React from 'react'
import styled, { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  LegacyStyledText,
  POSITION_FIXED,
  PrimaryButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

const StyledLabel = styled.label`
  display: ${DISPLAY_FLEX};
  cursor: ${CURSOR_POINTER};
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  width: 100%;
  padding: ${SPACING.spacing32};
  border: 2px dashed ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius4};
  text-align: ${TYPOGRAPHY.textAlignCenter};
  background-color: ${COLORS.white};

  &:hover {
    border: 2px dashed ${COLORS.blue50};
  }
`
const DRAG_OVER_STYLES = css`
  border: 2px dashed ${COLORS.blue50};
`

const StyledInput = styled.input`
  position: ${POSITION_FIXED};
  clip: rect(1px 1px 1px 1px);
`

export interface UploadInputProps {
  /** Callback function that is called when a file is uploaded. */
  onUpload: (file: File) => unknown
  /** Optional callback function that is called when the upload button is clicked. */
  onClick?: () => void
  /** Optional text for the upload button. If undefined, the button displays Upload */
  uploadButtonText?: string
  /** Optional text or JSX element that is displayed above the upload button. */
  uploadText?: string | JSX.Element
  /** Optional text or JSX element that is displayed in the drag and drop area. */
  dragAndDropText?: string | JSX.Element
}

export function UploadInput(props: UploadInputProps): JSX.Element | null {
  const {
    dragAndDropText,
    onClick,
    onUpload,
    uploadButtonText,
    uploadText,
  } = props
  const { t } = useTranslation('protocol_info')

  const fileInput = React.useRef<HTMLInputElement>(null)
  const [isFileOverDropZone, setIsFileOverDropZone] = React.useState<boolean>(
    false
  )
  const [isHover, setIsHover] = React.useState<boolean>(false)
  const handleDrop: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    Array.from(e.dataTransfer.files).forEach(f => onUpload(f))
    setIsFileOverDropZone(false)
  }
  const handleDragEnter: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
  }
  const handleDragLeave: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileOverDropZone(false)
    setIsHover(false)
  }
  const handleDragOver: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileOverDropZone(true)
    setIsHover(true)
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = _event => {
    onClick != null ? onClick() : fileInput.current?.click()
  }

  const onChange: React.ChangeEventHandler<HTMLInputElement> = event => {
    ;[...(event.target.files ?? [])].forEach(f => onUpload(f))
    if ('value' in event.currentTarget) event.currentTarget.value = ''
  }

  return (
    <Flex
      height="100%"
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_CENTER}
      alignItems={ALIGN_CENTER}
      gridGap={SPACING.spacing24}
    >
      {uploadText != null ? (
        <>
          {typeof uploadText === 'string' ? (
            <LegacyStyledText
              as="p"
              textAlign={TYPOGRAPHY.textAlignCenter}
              marginTop={SPACING.spacing16}
            >
              {uploadText}
            </LegacyStyledText>
          ) : (
            <>{uploadText}</>
          )}
        </>
      ) : null}
      <PrimaryButton
        onClick={handleClick}
        id="UploadInput_protocolUploadButton"
      >
        {uploadButtonText ?? t('upload')}
      </PrimaryButton>

      <StyledLabel
        data-testid="file_drop_zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onMouseEnter={() => {
          setIsHover(true)
        }}
        onMouseLeave={() => {
          setIsHover(false)
        }}
        css={isFileOverDropZone ? DRAG_OVER_STYLES : undefined}
      >
        <Icon
          width="4rem"
          color={isHover ? COLORS.blue50 : COLORS.grey60}
          name="upload"
          marginBottom={SPACING.spacing24}
        />
        {dragAndDropText}
        <StyledInput
          id="file_input"
          data-testid="file_input"
          ref={fileInput}
          type="file"
          onChange={onChange}
          multiple
        />
      </StyledLabel>
    </Flex>
  )
}
