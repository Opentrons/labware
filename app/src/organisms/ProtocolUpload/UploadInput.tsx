import * as React from 'react'

import {
  Icon,
  Text,
  Flex,
  PrimaryBtn,
  FONT_SIZE_BODY_2,
  FONT_WEIGHT_REGULAR,
  SPACING_3,
  SPACING_4,
  SPACING_5,
  C_MED_LIGHT_GRAY,
  C_MED_GRAY,
  SIZE_3,
  Link,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
  C_SELECTED_DARK,
  C_WHITE,
  JUSTIFY_CENTER,
  C_BLUE,
  SPACING_1,
  C_LIGHT_GRAY,
  DIRECTION_ROW,
  JUSTIFY_SPACE_BETWEEN,
  FONT_SIZE_CAPTION,
  FONT_BODY_1_DARK,
  SecondaryBtn,
  FONT_SIZE_BODY_1,
  SPACING_2,
  JUSTIFY_START,
  Btn,
} from '@opentrons/components'
import { css } from 'styled-components'
import { Trans, useTranslation } from 'react-i18next'
import { useMostRecentRunId } from './hooks/useMostRecentRunId'
import { useSelector } from 'react-redux'
import { State } from '../../redux/types'
import { getConnectedRobotName } from '../../redux/robot/selectors'
import { Divider } from '../../atoms/structure'
import { useRunQuery } from '@opentrons/react-api-client'
import { useProtocolDetails } from '../RunDetails/hooks'
import { RerunningProtocolModal } from './RerunningProtocolModal'
import { useCloneRun } from './hooks'

const PROTOCOL_LIBRARY_URL = 'https://protocols.opentrons.com'
const PROTOCOL_DESIGNER_URL = 'https://designer.opentrons.com'

const DROP_ZONE_STYLES = css`
  display: flex;
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  width: 50%;
  font-size: ${FONT_SIZE_BODY_2};
  font-weight: ${FONT_WEIGHT_REGULAR};
  padding: ${SPACING_5};
  border: 2px dashed ${C_MED_LIGHT_GRAY};
  border-radius: 6px;
  color: ${C_MED_GRAY};
  text-align: center;
  margin-bottom: ${SPACING_4};
  background-color: ${C_WHITE};
`
const DRAG_OVER_STYLES = css`
  background-color: ${C_SELECTED_DARK};
  color: ${C_WHITE};
`

const INPUT_STYLES = css`
  position: fixed;
  clip: rect(1px 1px 1px 1px);
`

export interface UploadInputProps {
  onUpload: (file: File) => unknown
}

const FILE_NAME = 'File name' //  TODO IMMEDIATELY wait for CPX to add this!

export function UploadInput(props: UploadInputProps): JSX.Element | null {
  const { t } = useTranslation('protocol_info')
  const mostRecentRun = useMostRecentRunId()
  const runQuery = useRunQuery(mostRecentRun)
  const protocolData = useProtocolDetails()
  const robotName = useSelector((state: State) => getConnectedRobotName(state))
  const cloneRun = useCloneRun(mostRecentRun != null ? mostRecentRun : '')
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [isFileOverDropZone, setIsFileOverDropZone] = React.useState<boolean>(
    false
  )
  const [rerunningProtocolModal, setRerunningProtocolModal] = React.useState(
    false
  )

  const labwareOffsets = runQuery.data?.data.labwareOffsets
  const protocolName = protocolData.displayName

  const handleDrop: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    const { files = [] } = 'dataTransfer' in e ? e.dataTransfer : {}
    props.onUpload(files[0])
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
  }
  const handleDragOver: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileOverDropZone(true)
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = _event => {
    fileInput.current?.click()
  }

  const onChange: React.ChangeEventHandler<HTMLInputElement> = event => {
    const { files = [] } = event.target ?? {}
    files?.[0] && props.onUpload(files?.[0])
    if ('value' in event.currentTarget) event.currentTarget.value = ''
  }

  const dropZoneStyles = isFileOverDropZone
    ? css`
        ${DROP_ZONE_STYLES} ${DRAG_OVER_STYLES}
      `
    : DROP_ZONE_STYLES

  const fullRunTimestamp = runQuery.data?.data.createdAt
  const indexToSplit = fullRunTimestamp?.indexOf('T')
  if (fullRunTimestamp == null) return null
  const date = fullRunTimestamp?.slice(0, indexToSplit)
  const timeAndUTC =
    indexToSplit != null ? fullRunTimestamp?.slice(indexToSplit + 1) : ''
  const timeToSplit = timeAndUTC.indexOf('.')
  const time = timeAndUTC.slice(0, timeToSplit)

  const UTC = timeAndUTC?.slice(timeToSplit + 7)

  return (
    <Flex
      height="100%"
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_CENTER}
      alignItems={ALIGN_CENTER}
    >
      {rerunningProtocolModal && (
        <RerunningProtocolModal
          onCloseClick={() => setRerunningProtocolModal(false)}
        />
      )}
      <PrimaryBtn
        onClick={handleClick}
        marginBottom={SPACING_4}
        backgroundColor={C_BLUE}
        id={'UploadInput_protocolUploadButton'}
      >
        {t('choose_file')}
      </PrimaryBtn>

      <label
        data-testid="file_drop_zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        css={dropZoneStyles}
      >
        <Icon width={SIZE_3} name="upload" marginBottom={SPACING_4} />

        <span
          aria-controls="file_input"
          role="button"
          id={'UploadInput_fileUploadLabel'}
        >
          {t('drag_file_here')}
        </span>

        <input
          id="file_input"
          data-testid="file_input"
          ref={fileInput}
          css={INPUT_STYLES}
          type="file"
          onChange={onChange}
        />
      </label>
      {mostRecentRun === null ? null : (
        <Flex flexDirection={DIRECTION_COLUMN} width={'80%'}>
          <Divider marginY={SPACING_3} />
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            flex={'auto'}
            marginBottom={SPACING_2}
          >
            <Trans
              t={t}
              i18nKey="robotName_last_run"
              values={{ robot_name: robotName }}
            />
            <Btn
              as={Link}
              fontSize={FONT_SIZE_BODY_1}
              color={C_BLUE}
              onClick={() => setRerunningProtocolModal(true)}
              id={'RerunningProtocol_Modal'}
            >
              {t('rerunning_protocol_modal_title')}
            </Btn>
          </Flex>
          <Flex
            flexDirection={DIRECTION_ROW}
            alignItems={ALIGN_CENTER}
            marginBottom={SPACING_4}
          >
            <Flex
              flex={'auto'}
              flexDirection={DIRECTION_COLUMN}
              justifyContent={JUSTIFY_CENTER}
            >
              <Text
                marginBottom={SPACING_1}
                color={C_MED_GRAY}
                fontSize={FONT_SIZE_CAPTION}
              >
                {t('protocol_name_title')}
              </Text>
              <Flex css={FONT_BODY_1_DARK}>
                {protocolName != null ? protocolName : <Text>{FILE_NAME}</Text>}
              </Flex>
            </Flex>
            <Flex
              flex={'auto'}
              flexDirection={DIRECTION_COLUMN}
              justifyContent={JUSTIFY_CENTER}
            >
              <Text
                marginBottom={SPACING_1}
                color={C_MED_GRAY}
                fontSize={FONT_SIZE_CAPTION}
              >
                {t('run_timestamp_title')}
              </Text>
              <Flex css={FONT_BODY_1_DARK} flexDirection={DIRECTION_ROW}>
                <Flex marginRight={SPACING_1}>{date}</Flex>
                <Flex marginRight={SPACING_1}>{time}</Flex>
                <Flex>{UTC}</Flex>
              </Flex>
            </Flex>
            <Flex
              flex={'auto'}
              flexDirection={DIRECTION_COLUMN}
              justifyContent={JUSTIFY_CENTER}
            >
              <Text
                marginBottom={SPACING_1}
                color={C_MED_GRAY}
                fontSize={FONT_SIZE_CAPTION}
              >
                {t('labware_offset_data_title')}
              </Text>
              <Flex css={FONT_BODY_1_DARK}>
                {labwareOffsets != null && labwareOffsets.length === 0 ? (
                  <Text>{t('no_labware_offset_Data')}</Text>
                ) : (
                  labwareOffsets != null && (
                    <Trans
                      t={t}
                      i18nKey="labware_offsets_info"
                      values={{ number: labwareOffsets.length }}
                    />
                  )
                )}
              </Flex>
            </Flex>
            <Flex>
              <SecondaryBtn
                onClick={cloneRun}
                color={C_BLUE}
                id={'UploadInput_runAgainButton'}
              >
                {t('run_again_btn')}
              </SecondaryBtn>
            </Flex>
          </Flex>
        </Flex>
      )}
      <hr style={{ borderTop: `1px solid ${C_LIGHT_GRAY}`, width: '80%' }} />
      <Text
        role="complementary"
        as="h4"
        marginBottom={SPACING_3}
        marginTop={SPACING_3}
      >
        {t('no_protocol_yet')}
      </Text>
      <Flex justifyContent={JUSTIFY_START} flexDirection={DIRECTION_COLUMN}>
        <Link
          fontSize={FONT_SIZE_BODY_2}
          color={C_BLUE}
          href={PROTOCOL_LIBRARY_URL}
          id={'UploadInput_protocolLibraryButton'}
          rel="noopener noreferrer"
          marginBottom={SPACING_1}
        >
          {t('browse_protocol_library')}
          <Icon name={'open-in-new'} marginLeft={SPACING_1} size="10px" />
        </Link>
        <Link
          fontSize={FONT_SIZE_BODY_2}
          color={C_BLUE}
          href={PROTOCOL_DESIGNER_URL}
          id={'UploadInput_protocolDesignerButton'}
          rel="noopener noreferrer"
        >
          {t('launch_protocol_designer')}
          <Icon name={'open-in-new'} marginLeft={SPACING_1} size="10px" />
        </Link>
      </Flex>
    </Flex>
  )
}
