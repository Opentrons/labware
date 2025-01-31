import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Tabs,
  SPACING,
} from '@opentrons/components'

import type { StyleProps } from '@opentrons/components'

type TabOptions = 'table' | 'jupyter' | 'cli'

export interface LabwareOffsetTabsProps extends StyleProps {
  TableComponent: JSX.Element
  JupyterComponent: JSX.Element
  CommandLineComponent: JSX.Element
}

export function LabwareOffsetTabs({
  TableComponent,
  JupyterComponent,
  CommandLineComponent,
  ...styleProps
}: LabwareOffsetTabsProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const [currentTab, setCurrentTab] = useState<TabOptions>('table')

  const activeTabComponent = {
    table: TableComponent,
    jupyter: JupyterComponent,
    cli: CommandLineComponent,
  }
  return (
    <Flex
      width="100%"
      height="100%"
      flexDirection={DIRECTION_COLUMN}
      {...styleProps}
    >
      <Flex gridGap={SPACING.spacing4} marginY={SPACING.spacing8}>
        <Tabs
          tabs={[
            {
              text: t('table_view'),
              isActive: currentTab === 'table',
              disabled: false,
              onClick: () => {
                setCurrentTab('table')
              },
            },
            {
              text: t('jupyter_notebook'),
              isActive: currentTab === 'jupyter',
              disabled: false,
              onClick: () => {
                setCurrentTab('jupyter')
              },
            },
            {
              text: t('cli_ssh'),
              isActive: currentTab === 'cli',
              disabled: false,
              onClick: () => {
                setCurrentTab('cli')
              },
            },
          ]}
        />
      </Flex>
      <Box
        backgroundColor={COLORS.white}
        // remove left upper corner border radius when first tab is active
        borderRadius={`${
          currentTab === 'table' ? '0' : BORDERS.borderRadius4
        } ${BORDERS.borderRadius4} ${BORDERS.borderRadius4} ${
          BORDERS.borderRadius4
        }`}
        paddingX={SPACING.spacing16}
      >
        {activeTabComponent[currentTab]}
      </Box>
    </Flex>
  )
}
