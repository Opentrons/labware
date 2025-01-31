import {
  DIRECTION_COLUMN,
  Flex,
  InputField,
  JUSTIFY_FLEX_END,
  ListButton,
  ListButtonAccordion,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { getLabwareDefURI } from '@opentrons/shared-data'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { reduce } from 'lodash'
import { ListButtonCheckbox } from '../../atoms/ListButtonCheckbox/ListButtonCheckbox'
import { LABWARES_FIELD_NAME } from '../LabwareLiquidsSection'
import { getOnlyLatestDefs } from '../../resources/utils'
import type { DisplayLabware } from '../LabwareLiquidsSection'
import type {
  LabwareDefByDefURI,
  LabwareDefinition2,
} from '@opentrons/shared-data'

const ORDERED_CATEGORIES: string[] = [
  'tipRack',
  'tubeRack',
  'wellPlate',
  'reservoir',
  'aluminumBlock',
  'adapter',
]

export function LabwareModal({
  displayLabwareModal,
  setDisplayLabwareModal,
}: {
  displayLabwareModal: boolean
  setDisplayLabwareModal: (value: boolean) => void
}): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const { watch, setValue } = useFormContext()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null
  )
  const labwares: DisplayLabware[] = watch(LABWARES_FIELD_NAME) ?? []
  const [selectedLabwares, setSelectedLabwares] = React.useState<string[]>(
    labwares.map(lw => lw.labwareURI)
  )

  const searchFilter = (termToCheck: string): boolean =>
    termToCheck.toLowerCase().includes(searchTerm.toLowerCase())

  const defs = getOnlyLatestDefs()

  const labwareByCategory: Record<
    string,
    LabwareDefinition2[]
  > = React.useMemo(() => {
    return reduce<LabwareDefByDefURI, Record<string, LabwareDefinition2[]>>(
      defs,
      (acc, def: typeof defs[keyof typeof defs]) => {
        const category: string = def.metadata.displayCategory

        return {
          ...acc,
          [category]: [...(acc[category] ?? []), def],
        }
      },
      {}
    )
  }, [])

  const populatedCategories: Record<string, boolean> = useMemo(
    () =>
      ORDERED_CATEGORIES.reduce((acc, category) => {
        return category in labwareByCategory &&
          labwareByCategory[category].some(lw =>
            searchFilter(lw.metadata.displayName as string)
          )
          ? {
              ...acc,
              [category]: labwareByCategory[category],
            }
          : acc
      }, {}),
    [labwareByCategory, searchTerm]
  )

  useEffect(() => {
    if (displayLabwareModal) {
      setSelectedLabwares(labwares.map(lw => lw.labwareURI))
    }
  }, [displayLabwareModal])

  const handleCategoryClick = (category: string): void => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }

  return (
    <>
      {displayLabwareModal &&
        createPortal(
          <Modal type="info" title={t('add_opentrons_labware')} marginLeft="0">
            <Flex flexDirection={DIRECTION_COLUMN}>
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing8}
                >
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {t('add_labware')}
                  </StyledText>
                  <InputField
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSearchTerm(e.target.value)
                    }}
                    placeholder={t('search_for_labware_placeholder')}
                    size="medium"
                    leftIcon="search"
                    showDeleteIcon
                    onDelete={() => {
                      setSearchTerm('')
                    }}
                  />
                </Flex>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing4}
                  paddingTop={SPACING.spacing8}
                  overflowY="auto"
                  maxHeight="500px"
                >
                  {ORDERED_CATEGORIES.map(category => {
                    const isPopulated = populatedCategories[category]
                    if (isPopulated) {
                      return (
                        <ListButton
                          key={`ListButton_${category}`}
                          type="noActive"
                          maxWidth="100% !important"
                          onClick={() => {
                            handleCategoryClick(category)
                          }}
                        >
                          <Flex id={`${category}`} width="100%">
                            <ListButtonAccordion
                              mainHeadline={t(`${category}`)}
                              isExpanded={category === selectedCategory}
                            >
                              {labwareByCategory[category]?.map(
                                (labwareDef, index) => {
                                  const labwareURI: string = getLabwareDefURI(
                                    labwareDef
                                  )
                                  const loadName =
                                    labwareDef.parameters.loadName
                                  const isMatch = searchFilter(
                                    labwareDef.metadata.displayName as string
                                  )
                                  if (isMatch) {
                                    return (
                                      <React.Fragment
                                        key={`${index}_${category}_${loadName}`}
                                      >
                                        <ListButtonCheckbox
                                          id={`${index}_${category}_${loadName}`}
                                          buttonText={
                                            labwareDef.metadata.displayName
                                          }
                                          buttonValue={labwareURI}
                                          onChange={e => {
                                            e.stopPropagation()

                                            setSelectedLabwares(
                                              selectedLabwares.includes(
                                                labwareURI
                                              )
                                                ? selectedLabwares.filter(
                                                    lw => lw !== labwareURI
                                                  )
                                                : [
                                                    ...selectedLabwares,
                                                    labwareURI,
                                                  ]
                                            )
                                          }}
                                          isSelected={selectedLabwares.includes(
                                            labwareURI
                                          )}
                                        />
                                      </React.Fragment>
                                    )
                                  }
                                }
                              )}
                            </ListButtonAccordion>
                          </Flex>
                        </ListButton>
                      )
                    }
                  })}
                </Flex>
              </Flex>

              <Flex
                justifyContent={JUSTIFY_FLEX_END}
                gap={SPACING.spacing8}
                paddingTop={SPACING.spacing24}
              >
                <SecondaryButton
                  onClick={() => {
                    setDisplayLabwareModal(false)
                    setSelectedLabwares(labwares.map(lw => lw.labwareURI))
                    setSelectedCategory(null)
                  }}
                >
                  {t('labwares_cancel_label')}
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    setDisplayLabwareModal(false)
                    setValue(
                      LABWARES_FIELD_NAME,
                      [
                        ...selectedLabwares.map(labwareURI => {
                          const existingLabware = labwares.find(
                            lw => lw.labwareURI === labwareURI
                          )
                          return {
                            labwareURI,
                            count:
                              existingLabware != null
                                ? existingLabware.count
                                : 1,
                          }
                        }),
                      ],
                      { shouldValidate: true }
                    )
                    setSelectedCategory(null)
                  }}
                >
                  {t('labwares_save_label')}
                </PrimaryButton>
              </Flex>
            </Flex>
          </Modal>,
          global.document.body
        )}
    </>
  )
}
