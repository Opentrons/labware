import { Trans, useTranslation } from 'react-i18next'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'

import type { ReactNode } from 'react'
import type { FileUploadMessage } from '../../load-file'

export interface ModalContents {
  title: string
  body: ReactNode
}

interface ModalProps {
  t: any
  errorMessage?: string | null
}

const getInvalidFileType = (props: ModalProps): ModalContents => {
  const { t } = props
  return {
    title: t('incorrect_file_header'),
    body: (
      <StyledText desktopStyle="bodyDefaultRegular">
        {t('incorrect_file_type_body')}
      </StyledText>
    ),
  }
}

const invalidJsonModal = (props: ModalProps): ModalContents => {
  const { t, errorMessage } = props
  return {
    title: t('invalid_json_file'),
    body: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('invalid_json_file_body')}
        </StyledText>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing4}
          marginTop={SPACING.spacing8}
        >
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t('invalid_json_file_error')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.red50}>
            {errorMessage}
          </StyledText>
        </Flex>
      </Flex>
    ),
  }
}

export const getGenericDidMigrateMessage = (
  props: ModalProps
): ModalContents => {
  const { t } = props

  return {
    title: t('migration_header'),
    body: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.generic.body1')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.generic.body2')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.generic.body3')}
        </StyledText>
      </Flex>
    ),
  }
}

export const getNoBehaviorChangeMessage = (
  props: ModalProps
): ModalContents => {
  const { t } = props

  return {
    title: t('migration_header'),
    body: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.noBehaviorChange.body1')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.noBehaviorChange.body2')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.noBehaviorChange.body3')}
        </StyledText>
      </Flex>
    ),
  }
}

export const getToV8MigrationMessage = (props: ModalProps): ModalContents => {
  const { t } = props

  return {
    title: t('migration_header'),
    body: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8Migration.body1')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8Migration.body2')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8Migration.body3')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8Migration.body4')}
        </StyledText>
      </Flex>
    ),
  }
}

export const getToV8_1MigrationMessage = (props: ModalProps): ModalContents => {
  const { t } = props

  return {
    title: t('migration_header'),

    body: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8_1Migration.body1')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8_1Migration.body2')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV8_1Migration.body3')}
        </StyledText>
      </Flex>
    ),
  }
}

export const getToV3MigrationMessage = (props: ModalProps): ModalContents => {
  const { t } = props

  return {
    title: t('migrations.toV3Migration.title'),
    body: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          <Trans
            t={t}
            i18nKey="migrations.toV3Migration.body1"
            components={{ strong: <strong /> }}
          />
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV3Migration.body2')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV3Migration.body3')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV3Migration.body4')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV3Migration.body5')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('migrations.toV3Migration.body6')}
        </StyledText>
      </Flex>
    ),
  }
}

interface MigrationMessageProps {
  migrationsRan: string[]
  t: any
}

export const getMigrationMessage = (
  props: MigrationMessageProps
): ModalContents => {
  const { t, migrationsRan } = props

  if (migrationsRan.includes('3.0.0')) {
    return getToV3MigrationMessage({ t })
  }
  const noBehaviorMigrations = [
    ['5.0.0'],
    ['5.0.0', '5.1.0'],
    ['5.0.0', '5.1.0', '5.2.0'],
  ]
  if (
    noBehaviorMigrations.some(migrationList =>
      migrationsRan.every(migration => migrationList.includes(migration))
    )
  ) {
    return getNoBehaviorChangeMessage({ t })
  }
  if (migrationsRan.includes('8.1.0')) {
    return getToV8_1MigrationMessage({ t })
  } else if (migrationsRan.includes('8.0.0')) {
    return getToV8MigrationMessage({ t })
  }

  return getGenericDidMigrateMessage({ t })
}

interface FileUploadModalContentsProps {
  uploadResponse?: FileUploadMessage | null
}
export function useFileUploadModalContents(
  props: FileUploadModalContentsProps
): ModalContents | null {
  const { uploadResponse } = props
  const { t } = useTranslation('shared')

  if (uploadResponse == null) return null

  if (uploadResponse.isError) {
    switch (uploadResponse.errorType) {
      case 'INVALID_FILE_TYPE':
        return getInvalidFileType({ t })
      case 'INVALID_JSON_FILE':
        return invalidJsonModal({
          errorMessage: uploadResponse.errorMessage,
          t,
        })
      default: {
        console.error('Invalid error type specified for modal')
        return null
      }
    }
  }
  switch (uploadResponse.messageKey) {
    case 'DID_MIGRATE':
      return getMigrationMessage({
        migrationsRan: uploadResponse.migrationsRan,
        t,
      })
    default: {
      console.assert(
        false,
        `invalid messageKey ${uploadResponse.messageKey} specified for modal`
      )
      return { title: '', body: uploadResponse.messageKey }
    }
  }
}
