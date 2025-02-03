import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { SketchPicker } from 'react-color'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { Controller, useForm } from 'react-hook-form'
import styled from 'styled-components'
import {
  DEFAULT_LIQUID_COLORS,
  getAllLiquidClassDefs,
} from '@opentrons/shared-data'
import {
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DropdownMenu,
  Flex,
  InputField,
  JUSTIFY_END,
  JUSTIFY_SPACE_BETWEEN,
  LiquidIcon,
  Modal,
  POSITION_ABSOLUTE,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  useOnClickOutside,
} from '@opentrons/components'
import * as labwareIngredActions from '../../labware-ingred/actions'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { HandleEnter } from '../../atoms/HandleEnter'
import { LINE_CLAMP_TEXT_STYLE } from '../../atoms'
import { getEnableLiquidClasses } from '../../feature-flags/selectors'
import { swatchColors } from './swatchColors'

import type { ColorResult, RGBColor } from 'react-color'
import type { ThunkDispatch } from 'redux-thunk'
import type { BaseState } from '../../types'
import type { LiquidEntity } from '@opentrons/step-generation'

const liquidEditFormSchema: any = Yup.object().shape({
  displayName: Yup.string().required('liquid name is required'),
  displayColor: Yup.string(),
  description: Yup.string(),
  liquidClass: Yup.string(),
})

interface DefineLiquidsModalProps {
  onClose: () => void
}
export function DefineLiquidsModal(
  props: DefineLiquidsModalProps
): JSX.Element {
  const { onClose } = props
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const { t } = useTranslation(['liquids', 'shared'])
  const selectedLiquid = useSelector(
    labwareIngredSelectors.getSelectedLiquidGroupState
  )
  const nextGroupId = useSelector(labwareIngredSelectors.getNextLiquidGroupId)
  const selectedLiquidGroupState = useSelector(
    labwareIngredSelectors.getSelectedLiquidGroupState
  )
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false)
  const chooseColorWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      setShowColorPicker(false)
    },
  })
  const allIngredientGroupFields = useSelector(
    labwareIngredSelectors.allIngredientGroupFields
  )
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)
  const liquidClassDefs = getAllLiquidClassDefs()

  const liquidGroupId = selectedLiquidGroupState.liquidGroupId
  const deleteLiquidGroup = (): void => {
    if (liquidGroupId != null) {
      dispatch(labwareIngredActions.deleteLiquidGroup(liquidGroupId))
    }
    onClose()
  }

  const cancelForm = (): void => {
    dispatch(labwareIngredActions.deselectLiquidGroup())
    onClose()
  }

  const saveForm = (formData: LiquidEntity): void => {
    dispatch(
      labwareIngredActions.editLiquidGroup({
        ...formData,
      })
    )
    onClose()
  }

  const selectedIngredFields =
    liquidGroupId != null ? allIngredientGroupFields[liquidGroupId] : null
  const liquidId = selectedLiquid.liquidGroupId ?? nextGroupId

  const initialValues: LiquidEntity = {
    displayName: selectedIngredFields?.displayName ?? '',
    displayColor: selectedIngredFields?.displayColor ?? swatchColors(liquidId),
    liquidClass: selectedIngredFields?.liquidClass ?? '',
    description: selectedIngredFields?.description ?? '',
    pythonName: `liquid_${parseInt(liquidGroupId ?? nextGroupId) + 1}`,
    liquidGroupId: liquidGroupId ?? nextGroupId,
  }

  const {
    handleSubmit,
    formState,
    control,
    watch,
    setValue,
    register,
  } = useForm<LiquidEntity>({
    defaultValues: initialValues,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    resolver: yupResolver(liquidEditFormSchema),
  })
  const name = watch('displayName')
  const color = watch('displayColor')
  const liquidClass = watch('liquidClass')
  const { errors, touchedFields } = formState

  const handleLiquidEdits = (values: LiquidEntity): void => {
    saveForm({
      displayName: values.displayName,
      displayColor: values.displayColor,
      liquidClass:
        values.liquidClass !== '' ? values.liquidClass ?? undefined : undefined,
      description: values.description !== '' ? values.description : null,
      pythonName: values.pythonName,
      liquidGroupId: values.liquidGroupId,
    })
  }

  const rgbaToHex = (rgba: RGBColor): string => {
    const { r, g, b, a } = rgba
    const toHex = (n: number): string => n.toString(16).padStart(2, '0')
    const alpha = a != null ? Math.round(a * 255) : 255
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`
  }

  const liquidClassOptions = [
    { name: 'Choose an option', value: '' },
    ...Object.entries(liquidClassDefs).map(
      ([liquidClassDefName, { displayName }]) => {
        return { name: displayName, value: liquidClassDefName }
      }
    ),
  ]

  return (
    <HandleEnter
      onEnter={() => {
        void handleSubmit(handleLiquidEdits)()
      }}
    >
      <Modal
        marginLeft="0"
        zIndexOverlay={15}
        width="37.125rem"
        title={
          selectedIngredFields != null ? (
            <Flex gridGap={SPACING.spacing8}>
              <LiquidIcon color={initialValues.displayColor} />
              <StyledText
                desktopStyle="bodyLargeSemiBold"
                css={LINE_CLAMP_TEXT_STYLE(1)}
              >
                {initialValues.displayName}
              </StyledText>
            </Flex>
          ) : (
            t('define_liquid')
          )
        }
        type="info"
        onClose={onClose}
      >
        <form
          onSubmit={() => {
            void handleSubmit(handleLiquidEdits)()
          }}
        >
          <>
            {showColorPicker ? (
              <Flex
                position={POSITION_ABSOLUTE}
                left="4.375rem"
                top="4.6875rem"
                ref={chooseColorWrapperRef}
                zIndex={2}
              >
                <Controller
                  name="displayColor"
                  control={control}
                  render={({ field }) => (
                    <SketchPicker
                      presetColors={DEFAULT_LIQUID_COLORS}
                      color={color}
                      onChange={(color: ColorResult) => {
                        const hex = rgbaToHex(color.rgb)
                        setValue('displayColor', hex)
                        field.onChange(hex)
                      }}
                    />
                  )}
                />
              </Flex>
            ) : null}

            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing12}
              >
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  color={COLORS.grey60}
                  gridGap={SPACING.spacing4}
                >
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('name')}
                  </StyledText>
                  <Controller
                    control={control}
                    name="displayName"
                    render={({ field }) => (
                      <InputField
                        name="displayName"
                        error={
                          touchedFields.displayName != null
                            ? errors.displayName?.message
                            : null
                        }
                        value={name}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </Flex>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  color={COLORS.grey60}
                  gridGap={SPACING.spacing4}
                >
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('description')}
                  </StyledText>
                  <DescriptionField {...register('description')} />
                </Flex>
                {enableLiquidClasses ? (
                  <Flex flexDirection={DIRECTION_COLUMN} color={COLORS.grey60}>
                    <Controller
                      control={control}
                      name="liquidClass"
                      render={({ field }) => (
                        <DropdownMenu
                          title={t('liquid_class.title')}
                          tooltipText={t('liquid_class.tooltip')}
                          dropdownType="neutral"
                          width="100%"
                          filterOptions={liquidClassOptions}
                          currentOption={
                            liquidClassOptions.find(
                              ({ value }) => value === liquidClass
                            ) ?? liquidClassOptions[0]
                          }
                          onClick={value => {
                            field.onChange(value)
                            setValue('liquidClass', value)
                          }}
                        />
                      )}
                    />
                  </Flex>
                ) : null}
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  color={COLORS.grey60}
                  gridGap={SPACING.spacing4}
                >
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('display_color')}
                  </StyledText>

                  <LiquidIcon
                    onClick={() => {
                      setShowColorPicker(prev => !prev)
                    }}
                    color={color}
                    size="medium"
                  />
                </Flex>
              </Flex>
              <Flex
                justifyContent={
                  selectedIngredFields != null
                    ? JUSTIFY_SPACE_BETWEEN
                    : JUSTIFY_END
                }
                gridGap={SPACING.spacing8}
              >
                {selectedIngredFields != null ? (
                  <Btn
                    onClick={deleteLiquidGroup}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('delete_liquid')}
                    </StyledText>
                  </Btn>
                ) : (
                  <SecondaryButton onClick={cancelForm}>
                    {t('shared:close')}
                  </SecondaryButton>
                )}
                <PrimaryButton
                  type="submit"
                  disabled={
                    errors.displayName != null ||
                    name === '' ||
                    errors.displayColor != null
                  }
                >
                  {t('shared:save')}
                </PrimaryButton>
              </Flex>
            </Flex>
          </>
        </form>
      </Modal>
    </HandleEnter>
  )
}

export const DescriptionField = styled.textarea`
  min-height: 5rem;
  width: 100%;
  border: 1px ${BORDERS.styleSolid} ${COLORS.grey50};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  font-size: ${TYPOGRAPHY.fontSizeP};
  resize: none;
`
