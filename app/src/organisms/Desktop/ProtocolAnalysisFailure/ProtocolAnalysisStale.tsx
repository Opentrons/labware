import { useDispatch } from 'react-redux'
import { useTranslation, Trans } from 'react-i18next'

import {
  ALIGN_CENTER,
  Banner,
  Btn,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  WRAP_REVERSE,
} from '@opentrons/components'
import { analyzeProtocol } from '/app/redux/protocol-storage'

import type { MouseEventHandler } from 'react'
import type { Dispatch } from '/app/redux/types'

interface ProtocolAnalysisStaleProps {
  protocolKey: string
}

export function ProtocolAnalysisStale(
  props: ProtocolAnalysisStaleProps
): JSX.Element {
  const { protocolKey } = props
  const { t } = useTranslation(['protocol_list', 'shared'])
  const dispatch = useDispatch<Dispatch>()

  const handleClickReanalyze: MouseEventHandler = e => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(analyzeProtocol(protocolKey))
  }
  return (
    <Banner type="warning" marginRight={SPACING.spacing24}>
      <Flex
        columnGap={SPACING.spacing8}
        flex="1"
        flexWrap={WRAP_REVERSE}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
        width="100%"
      >
        <LegacyStyledText as="p">
          {t('protocol_analysis_outdated')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          <Trans
            t={t}
            i18nKey="reanalyze_to_view"
            components={{
              analysisLink: (
                <Btn
                  as="a"
                  role="button"
                  textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  onClick={handleClickReanalyze}
                />
              ),
            }}
          />
        </LegacyStyledText>
      </Flex>
    </Banner>
  )
}
