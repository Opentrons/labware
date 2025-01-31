import { Trans, useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_AROUND,
  Link as LinkComponent,
  SPACING,
  StyledText,
} from '@opentrons/components'

import magTempCombined from '../../assets/images/modules/magdeck_tempdeck_combined.png'
import thermocycler from '../../assets/images/modules/thermocycler.png'
import multiSelect from '../../assets/images/announcements/multi_select.gif'
import batchEdit from '../../assets/images/announcements/batch_edit.gif'
import heaterShaker from '../../assets/images/modules/heatershaker.png'
import thermocyclerGen2 from '../../assets/images/modules/thermocycler_gen2.png'
import liquidEnhancements from '../../assets/images/announcements/liquid-enhancements.gif'
import opentronsFlex from '../../assets/images/OpentronsFlex.png'
import deckConfigutation from '../../assets/images/deck_configuration.png'
import { DOC_URL } from '../KnowledgeLink'
import type { ReactNode } from 'react'

export interface Announcement {
  announcementKey: string
  image: ReactNode | null
  heading: string
  message: ReactNode
}

const modulesDiagramsRow = css`
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 19.294%;
  padding-right: 19.294%;
`
const modulesDiagram = css`
  width: 100%;
  height: 100%;
`
const batchEditStyles = css`
  justify-content: ${JUSTIFY_SPACE_AROUND};
  padding: ${SPACING.spacing16};

  & img {
    height: 13rem;
  }
`

const PD = 'Protocol Designer'
const APP = 'Opentrons App'
const OPENTRONS_PD = 'Opentrons Protocol Designer'

export const useAnnouncements = (): Announcement[] => {
  const { t } = useTranslation('modal')
  const pdVersion = process.env.OT_PD_VERSION

  return [
    {
      announcementKey: 'modulesRequireRunAppUpdate',
      image: (
        <div css={modulesDiagramsRow}>
          <img css={modulesDiagram} src={magTempCombined} />
        </div>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>
            {t('announcements.modulesRequireRunAppUpdate.body1', { pd: PD })}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.modulesRequireRunAppUpdate.body2'}
              components={{ bold: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'thermocyclerSupport',
      image: (
        <div
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 2rem;
            padding: 0 25%;
          `}
        >
          <img css={modulesDiagram} src={thermocycler} />
        </div>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>{t('announcements.thermocyclerSupport.body1', { pd: PD })}</p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.thermocyclerSupport.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'airGapDelaySettings',
      heading: t('announcements.header', { pd: PD }),
      image: null,
      message: (
        <>
          <p>{t('announcements.airGapDelaySettings.body1', { pd: PD })}</p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.airGapDelaySettings.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'batchEditTransfer',
      image: (
        <Flex css={batchEditStyles}>
          <img src={multiSelect} />

          <img src={batchEdit} />
        </Flex>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>{t('announcements.batchEditTransfer.body1')}</p>
          <ul>
            <li>{t('announcements.batchEditTransfer.body2')}</li>
            <li>{t('announcements.batchEditTransfer.body3')}</li>
          </ul>

          <p>
            <Trans
              t={t}
              i18nKey={'announcements.batchEditTransfer.body4'}
              components={{ strong: <strong /> }}
            />
          </p>

          <p>{t('announcements.batchEditTransfer.body5')}</p>
        </>
      ),
    },
    {
      announcementKey: 'heaterShakerSupport',
      image: (
        <div css={modulesDiagramsRow}>
          <img css={modulesDiagram} src={heaterShaker} />
        </div>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>
            {t('announcements.heaterShakerSupport.body1', {
              opd: OPENTRONS_PD,
            })}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.heaterShakerSupport.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'thermocyclerGen2Support',
      image: (
        <div css={modulesDiagramsRow}>
          <img css={modulesDiagram} src={thermocyclerGen2} />
        </div>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>
            {t('announcements.thermocyclerGen2Support.body1', {
              opd: OPENTRONS_PD,
            })}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.thermocyclerGen2Support.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'liquidColorEnhancements',
      image: (
        <div
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 6%;
          `}
        >
          <img css={modulesDiagram} src={liquidEnhancements} />
        </div>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>
            {t('announcements.liquidColorEnhancements.body1', {
              opd: OPENTRONS_PD,
            })}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.liquidColorEnhancements.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'flexSupport7.0',
      image: (
        <Flex justifyContent={JUSTIFY_CENTER}>
          <img height="240" width="240" src={opentronsFlex} />
        </Flex>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>
            {t('announcements.flexSupport.body1', {
              pd: PD,
              flex: 'Opentrons Flex',
            })}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.flexSupport.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'deckConfigAnd96Channel8.0',
      image: (
        <Flex justifyContent={JUSTIFY_CENTER} paddingTop={SPACING.spacing8}>
          <img width="340" src={deckConfigutation} />
        </Flex>
      ),
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>{t('announcements.deckConfigAnd96Channel.body1', { pd: PD })}</p>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.deckConfigAnd96Channel.body2'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'customParamsAndMultiTipAndModule8.1',
      image: <Flex />,
      heading: t('announcements.header', { pd: PD }),
      message: (
        <>
          <p>
            {t('announcements.customParamsAndMultiTipAndModule.body1', {
              pd: PD,
            })}
          </p>
          <ul>
            <li>{t('announcements.customParamsAndMultiTipAndModule.body2')}</li>
            <li>
              <Trans
                t={t}
                i18nKey={'announcements.customParamsAndMultiTipAndModule.body3'}
                components={{ i: <em /> }}
              />
            </li>
            <li>{t('announcements.customParamsAndMultiTipAndModule.body4')}</li>
            <li>{t('announcements.customParamsAndMultiTipAndModule.body5')}</li>
          </ul>
          <p>
            <Trans
              t={t}
              i18nKey={'announcements.customParamsAndMultiTipAndModule.body6'}
              components={{ strong: <strong /> }}
              values={{ app: APP }}
            />
          </p>
        </>
      ),
    },
    {
      announcementKey: 'redesign8.2',
      image: <Flex />,
      heading: t('announcements.redesign.body1', { version: pdVersion }),
      message: (
        <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('announcements.redesign.body2')}
          </StyledText>
          <Flex marginLeft={SPACING.spacing16}>
            <ul>
              <li>
                <StyledText desktopStyle="bodyDefaultRegular">
                  {t('announcements.redesign.body3')}
                </StyledText>
              </li>
            </ul>
          </Flex>
          <StyledText desktopStyle="bodyDefaultRegular">
            <Trans
              t={t}
              components={{ strong: <strong /> }}
              i18nKey="announcements.redesign.body4"
            />
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            <Trans
              t={t}
              components={{
                link1: (
                  <LinkComponent
                    external
                    href={DOC_URL}
                    color={COLORS.blue50}
                  />
                ),
              }}
              i18nKey="announcements.redesign.body5"
            />
          </StyledText>
        </Flex>
      ),
    },
  ]
}
