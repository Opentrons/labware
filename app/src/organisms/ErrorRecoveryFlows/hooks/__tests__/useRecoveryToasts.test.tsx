import { vi, describe, it, expect, beforeEach } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import { i18n } from '/app/i18n'
import { renderHook, render, screen } from '@testing-library/react'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  useRecoveryToasts,
  useRecoveryToastText,
  getStepNumber,
  useRecoveryFullCommandText,
} from '../useRecoveryToasts'
import { RECOVERY_MAP } from '../../constants'
import { useToaster } from '../../../ToasterOven'
import { useCommandTextString } from '/app/local-resources/commands'

import type { ReactElement } from 'react'
import type { Mock } from 'vitest'
import type { BuildToast } from '../useRecoveryToasts'

vi.mock('../../../ToasterOven')
vi.mock('/app/local-resources/commands')

const TEST_COMMAND = 'test command'
const TC_COMMAND =
  'tc starting profile of 1231231 element steps composed of some extra text bla bla'

let mockMakeToast: Mock

const DEFAULT_PROPS: BuildToast = {
  isOnDevice: false,
  stepCounts: {
    currentStepNumber: 1,
    hasRunDiverged: false,
    totalStepCount: 1,
  },
  selectedRecoveryOption: RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE,
  commandTextData: { commands: [] } as any,
  robotType: FLEX_ROBOT_TYPE,
  allRunDefs: [],
}

// Utility function for rendering with I18nextProvider
const renderWithI18n = (component: ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>)
}

describe('useRecoveryToasts', () => {
  beforeEach(() => {
    mockMakeToast = vi.fn()
    vi.mocked(useToaster).mockReturnValue({ makeToast: mockMakeToast } as any)
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'generic',
      commandText: TEST_COMMAND,
    })
  })

  it('should return makeSuccessToast function', () => {
    const { result } = renderHook(() => useRecoveryToasts(DEFAULT_PROPS))

    expect(result.current.makeSuccessToast).toBeInstanceOf(Function)
  })

  it(`should not make toast for ${RECOVERY_MAP.CANCEL_RUN.ROUTE} option`, () => {
    const { result } = renderHook(() =>
      useRecoveryToasts({
        ...DEFAULT_PROPS,
        selectedRecoveryOption: RECOVERY_MAP.CANCEL_RUN.ROUTE,
      })
    )

    result.current.makeSuccessToast()
    expect(mockMakeToast).not.toHaveBeenCalled()
  })

  it('should make toast with correct parameters for desktop', () => {
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'generic',
      commandText: TEST_COMMAND,
    })

    const { result } = renderHook(() =>
      useRecoveryToasts({
        ...DEFAULT_PROPS,
        commandTextData: { commands: [TEST_COMMAND] } as any,
      })
    )

    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'generic',
      commandText: TEST_COMMAND,
    })

    result.current.makeSuccessToast()
    expect(mockMakeToast).toHaveBeenCalledWith(
      'test command',
      'success',
      expect.objectContaining({
        closeButton: true,
        disableTimeout: true,
        displayType: 'desktop',
        heading: 'Retrying step 1 succeeded.',
      })
    )
  })

  it('should make toast with correct parameters for ODD', () => {
    const { result } = renderHook(() =>
      useRecoveryToasts({
        ...DEFAULT_PROPS,
        isOnDevice: true,
      })
    )

    result.current.makeSuccessToast()
    expect(mockMakeToast).toHaveBeenCalledWith(
      expect.any(String),
      'success',
      expect.objectContaining({
        closeButton: true,
        disableTimeout: true,
        displayType: 'odd',
        heading: undefined,
      })
    )
  })

  it('should use recoveryToastText when desktopFullCommandText is null', () => {
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'generic',
      commandText: '',
    })

    const { result } = renderHook(() =>
      useRecoveryToasts({
        ...DEFAULT_PROPS,
        commandTextData: { commands: [] } as any,
      })
    )

    result.current.makeSuccessToast()
    expect(mockMakeToast).toHaveBeenCalledWith(
      expect.any(String),
      'success',
      expect.objectContaining({
        closeButton: true,
        disableTimeout: true,
        displayType: 'desktop',
        heading: expect.any(String),
      })
    )
  })
})

describe('useRecoveryToastText', () => {
  it(`should return correct text for ${RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE} option`, () => {
    const { result } = renderHook(() =>
      useRecoveryToastText({
        stepNumber: 2,
        selectedRecoveryOption: RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE,
      })
    )

    renderWithI18n(<div>{result.current}</div>)
    screen.getByText('Retrying step 2 succeeded.')
  })

  it(`should return correct text for ${RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE} option`, () => {
    const { result } = renderHook(() =>
      useRecoveryToastText({
        stepNumber: 3,
        selectedRecoveryOption: RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE,
      })
    )

    renderWithI18n(<div>{result.current}</div>)
    screen.getByText('Skipping to step 3 succeeded.')
  })
})

describe('getStepNumber', () => {
  it(`should return current step for ${RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE} option`, () => {
    expect(getStepNumber(RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE, 3)).toBe(3)
  })

  it(`should return next step for ${RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE} option`, () => {
    expect(getStepNumber(RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE, 3)).toBe(
      4
    )
  })

  it('should handle a falsy currentStepCount', () => {
    expect(getStepNumber(RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE, null)).toBe(null)
  })

  it('should handle unknown recovery option', () => {
    expect(getStepNumber('UNKNOWN_OPTION' as any, 3)).toBeNull()
  })
})

describe('useRecoveryFullCommandText', () => {
  it('should return the correct command text', () => {
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'generic',
      commandText: TEST_COMMAND,
    })

    const { result } = renderHook(() =>
      useRecoveryFullCommandText({
        robotType: FLEX_ROBOT_TYPE,
        stepNumber: 1,
        commandTextData: { commands: [TEST_COMMAND, {}] } as any,
        allRunDefs: [],
      })
    )

    expect(result.current).toBe(TEST_COMMAND)
  })

  it('should return null when relevantCmd is null', () => {
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'generic',
      commandText: '',
    })

    const { result } = renderHook(() =>
      useRecoveryFullCommandText({
        robotType: FLEX_ROBOT_TYPE,
        stepNumber: 1,
        commandTextData: { commands: [] } as any,
        allRunDefs: [],
      })
    )

    expect(result.current).toBeNull()
  })

  it('should return null if there is no current step count', () => {
    const { result } = renderHook(() =>
      useRecoveryFullCommandText({
        robotType: FLEX_ROBOT_TYPE,
        stepNumber: null,
        commandTextData: { commands: [] } as any,
        allRunDefs: [],
      })
    )

    expect(result.current).toBeNull()
  })

  it('should truncate TC command', () => {
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'thermocycler/runProfile',
      commandText: TC_COMMAND,
      stepTexts: ['step'],
    })

    const { result } = renderHook(() =>
      useRecoveryFullCommandText({
        robotType: FLEX_ROBOT_TYPE,
        stepNumber: 1,
        commandTextData: {
          commands: [TC_COMMAND],
        } as any,
        allRunDefs: [],
      })
    )
    expect(result.current).toBe('tc starting profile of 1231231 element steps')
  })

  it('should truncate new TC command', () => {
    vi.mocked(useCommandTextString).mockReturnValue({
      kind: 'thermocycler/runExtendedProfile',
      commandText: TC_COMMAND,
      profileElementTexts: [{ kind: 'step', stepText: 'blah blah blah' }],
    })

    const { result } = renderHook(() =>
      useRecoveryFullCommandText({
        robotType: FLEX_ROBOT_TYPE,
        stepNumber: 1,
        commandTextData: {
          commands: [TC_COMMAND, {}],
        } as any,
        allRunDefs: [],
      })
    )
    expect(result.current).toBe('tc starting profile of 1231231 element steps')
  })
})
