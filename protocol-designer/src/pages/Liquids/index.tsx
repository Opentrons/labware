import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  DIRECTION_COLUMN,
  Flex,
  useOnClickOutside,
} from '@opentrons/components'
import {
  AssignLiquidsModal,
  DefineLiquidsModal,
  DesignerNavigation,
} from '../../organisms'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { LiquidsOverflowMenu } from '../Designer/LiquidsOverflowMenu'

export function Liquids(): JSX.Element {
  const navigate = useNavigate()
  const selectedLabware = useSelector(
    labwareIngredSelectors.getSelectedLabwareId
  )
  const [liquidOverflowMenu, showLiquidOverflowMenu] = useState<boolean>(false)
  const [showDefineLiquidModal, setDefineLiquidModal] = useState<boolean>(false)
  const overflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      if (!showDefineLiquidModal) {
        showLiquidOverflowMenu(false)
      }
    },
  })

  useEffect(() => {
    if (selectedLabware == null) {
      console.warn('selectedLabware was lost, navigate to deisgner page')
      navigate('/designer')
    }
  })

  return (
    <>
      {showDefineLiquidModal ? (
        <DefineLiquidsModal
          onClose={() => {
            setDefineLiquidModal(false)
          }}
        />
      ) : null}
      {liquidOverflowMenu ? (
        <LiquidsOverflowMenu
          overflowWrapperRef={overflowWrapperRef}
          onClose={() => {
            showLiquidOverflowMenu(false)
          }}
          showLiquidsModal={() => {
            showLiquidOverflowMenu(false)
            setDefineLiquidModal(true)
          }}
        />
      ) : null}

      <Flex flexDirection={DIRECTION_COLUMN}>
        <DesignerNavigation showLiquidOverflowMenu={showLiquidOverflowMenu} />
        <AssignLiquidsModal />
      </Flex>
    </>
  )
}
