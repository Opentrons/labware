import React from 'react'
import { FormikConfig } from 'formik'
import { when } from 'jest-when'
import { render, screen } from '@testing-library/react'
import { getDefaultFormState, LabwareFields } from '../../../fields'
import { isEveryFieldHidden } from '../../../utils'
import { WellSpacing } from '../../sections/WellSpacing'
import { wrapInFormik } from '../../utils/wrapInFormik'

jest.mock('../../../utils')

const isEveryFieldHiddenMock = isEveryFieldHidden as jest.MockedFunction<
  typeof isEveryFieldHidden
>

let formikConfig: FormikConfig<LabwareFields>

describe('WellSpacing', () => {
  beforeEach(() => {
    formikConfig = {
      initialValues: getDefaultFormState(),
      onSubmit: jest.fn(),
    }

    when(isEveryFieldHiddenMock)
      .calledWith(['gridSpacingX', 'gridSpacingY'], expect.any(Object))
      .mockReturnValue(false)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render when fields are visible', () => {
    render(wrapInFormik(<WellSpacing />, formikConfig))
    screen.getByRole('heading', { name: /Well Spacing/i })

    screen.getByText(
      'Well spacing measurements inform the robot how far away rows and columns are from each other.'
    )

    screen.getByRole('textbox', { name: /X Spacing \(Xs\)/i }) // TODO IMMEDIATELY this should work after Sarah's PR is merged & this is rebased
    screen.getByRole('textbox', { name: /Y Spacing \(Ys\)/i }) // TODO IMMEDIATELY this should work after Sarah's PR is merged & this is rebased
  })

  it('should NOT render when the labware type is aluminumBlock', () => {
    const { container } = render(
      wrapInFormik(<WellSpacing />, {
        ...formikConfig,
        initialValues: {
          ...formikConfig.initialValues,
          labwareType: 'aluminumBlock',
        },
      })
    )
    expect(container.firstChild).toBe(null)
  })
  it('should NOT render when the labware type is tubeRack', () => {
    const { container } = render(
      wrapInFormik(<WellSpacing />, {
        ...formikConfig,
        initialValues: {
          ...formikConfig.initialValues,
          labwareType: 'tubeRack',
        },
      })
    )
    expect(container.firstChild).toBe(null)
  })

  it('should not render when all fields are hidden', () => {
    when(isEveryFieldHiddenMock)
      .calledWith(['gridSpacingX', 'gridSpacingY'], formikConfig.initialValues)
      .mockReturnValue(true)
    const { container } = render(wrapInFormik(<WellSpacing />, formikConfig))
    expect(container.firstChild).toBe(null)
  })

  it('should render alert when error is present', () => {
    const FAKE_ERROR = 'ahh'
    formikConfig.initialErrors = { gridSpacingX: FAKE_ERROR }
    formikConfig.initialTouched = { gridSpacingX: true }
    render(wrapInFormik(<WellSpacing />, formikConfig))

    // TODO(IL, 2021-05-26): AlertItem should have role="alert", then we can `getByRole('alert', {name: FAKE_ERROR})`
    screen.getByText(FAKE_ERROR)
  })
})
