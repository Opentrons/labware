import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  ListItem,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getPipetteEntities } from '../../../../../step-forms/selectors'
import { getTiprackOptions } from '../../../../../ui/labware/selectors'
import { DropdownStepFormField } from '../../../../../molecules'
import type { FieldProps } from '../types'

interface TiprackFieldProps extends FieldProps {
  pipetteId?: unknown
}
export function TiprackField(props: TiprackFieldProps): JSX.Element {
  const {
    value,
    updateValue,
    pipetteId,
    padding = `0 ${SPACING.spacing16}`,
  } = props
  const { t } = useTranslation('protocol_steps')
  const pipetteEntities = useSelector(getPipetteEntities)
  const options = useSelector(getTiprackOptions)
  const defaultTiprackUris =
    pipetteId != null ? pipetteEntities[pipetteId as string].tiprackDefURI : []
  const tiprackOptions = options.filter(option =>
    defaultTiprackUris.includes(option.value)
  )

  useEffect(() => {
    //  if default value is not included in the pipette's tiprack uris then
    //  change it so it is
    if (!defaultTiprackUris.includes(value as string)) {
      updateValue(defaultTiprackUris[0])
    }
  }, [defaultTiprackUris, value, updateValue])
  const hasMissingTiprack = defaultTiprackUris.length > tiprackOptions.length
  return (
    <>
      {tiprackOptions.length > 1 ? (
        <DropdownStepFormField
          {...props}
          options={tiprackOptions}
          value={String(value) != null ? String(value) : null}
          title={t('tiprack')}
          tooltipContent={hasMissingTiprack ? 'missing_tiprack' : null}
        />
      ) : (
        <Flex
          padding={padding ?? SPACING.spacing16}
          gridGap={SPACING.spacing8}
          flexDirection={DIRECTION_COLUMN}
          width="100%"
        >
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
            {t('tiprack')}
          </StyledText>
          <ListItem type="noActive">
            <Flex padding={SPACING.spacing12}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {tiprackOptions[0].name}
              </StyledText>
            </Flex>
          </ListItem>
        </Flex>
      )}
    </>
  )
}
