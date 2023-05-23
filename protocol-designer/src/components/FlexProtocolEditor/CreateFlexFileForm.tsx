import React, { useState } from 'react'
import { i18n } from '../../localization'
import { FlexProtocolEditorComponent } from './FlexProtocolEditor'
import { StyledText } from './StyledText'
import styles from './FlexComponents.css'
import { UpdateConfirmation } from './FlexUpdateConfirmation'
import { actions as navActions } from '../../navigation'
import { useDispatch } from 'react-redux'
import { FlexHeadingButtonGroup } from './FlexFileDetails'

function FlexFormComponent(): JSX.Element {
  const dispatch = useDispatch()
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleCancelClick = (): void => {
    setShowConfirmation(false)
  }

  const handleConfirmClick = (): void => {
    // handle the update action here
    dispatch(navActions.navigateToPage('landing-page'))
    setShowConfirmation(false)
  }

  function protocolCancelClick(): void {
    setShowConfirmation(true)
  }

  return (
    <>
      {Boolean(showConfirmation) && (
        <>
          <UpdateConfirmation
            confirmationTitle={'Cancel Create Protocol?'}
            confirmationMessage={
              'Are you sure you want to cancel creating a protocol? Progress will be lost, You can’t undo this change.'
            }
            cancelButtonName={'Go back'}
            continueButtonName={'Cancel New Protocol'}
            handleCancelClick={handleCancelClick}
            handleConfirmClick={handleConfirmClick}
          />
        </>
      )}
      <div className={styles.flex_header}>
        <div className={styles.flex_title}>
          <StyledText as="h1">{i18n.t('flex.header.title')}</StyledText>
          <FlexHeadingButtonGroup
            protocolCancelClickProps={protocolCancelClick}
          />
        </div>
        <StyledText as="h5" className={styles.right_end}>
          {i18n.t('flex.header.required_fields')}
        </StyledText>
        <FlexProtocolEditorComponent
          FlexFileDetails={{
            isEditValue: false,
            tabIdValue: undefined,
            formProps: undefined,
          }}
        />
      </div>
    </>
  )
}

export const CreateFlexFileForm = FlexFormComponent
