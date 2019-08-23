// @flow
import * as React from 'react'
import { Formik } from 'formik'
import mapValues from 'lodash/mapValues'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { AlertItem, AlertModal, PrimaryButton } from '@opentrons/components'
import LabwareCreator from './components/LabwareCreator'
import { makeMaskToDecimal, maskToInteger, maskLoadName } from './fieldMasks'
import {
  labwareTypeOptions,
  tubeRackInsertOptions,
  aluminumBlockAutofills,
  aluminumBlockTypeOptions,
  aluminumBlockChildTypeOptions,
  getDefaultFormState,
  getImplicitAutofillValues,
  wellBottomShapeOptions,
  wellShapeOptions,
  yesNoOptions,
  tubeRackAutofills,
  SUGGESTED_X,
  SUGGESTED_Y,
  SUGGESTED_XY_RANGE,
  MAX_SUGGESTED_Z,
  LINK_CUSTOM_LABWARE_FORM,
} from './fields'
import labwareFormSchema from './labwareFormSchema'
import { getDefaultDisplayName, getDefaultLoadName } from './formSelectors'
import labwareTestProtocol, { pipetteNameOptions } from './labwareTestProtocol'
import fieldsToLabware from './fieldsToLabware'
import ConditionalLabwareRender from './components/ConditionalLabwareRender'
import Dropdown from './components/Dropdown'
import IntroCopy from './components/IntroCopy'
import LinkOut from './components/LinkOut'
import RadioField from './components/RadioField'
import Section from './components/Section'
import TextField from './components/TextField'
import styles from './styles.css'
import type {
  LabwareFields,
  LabwareType,
  ProcessedLabwareFields,
  WellShape,
  WellBottomShape,
} from './fields'

const maskTo2Decimal = makeMaskToDecimal(2)

type MakeAutofillOnChangeArgs = {|
  name: $Keys<LabwareFields>,
  autofills: { [string]: $Shape<LabwareFields> },
  values: LabwareFields,
  touched: Object,
  setTouched: ({ [$Keys<LabwareFields>]: boolean }) => void,
  setValues: ($Shape<LabwareFields>) => void,
|}
const makeAutofillOnChange = ({
  autofills,
  values,
  touched,
  setValues,
  setTouched,
}: MakeAutofillOnChangeArgs) => (name: string, value: ?string) => {
  if (value == null) {
    console.log(`no value for ${name}, skipping autofill`)
    return
  }
  const _autofillValues = autofills[value]
  if (_autofillValues) {
    const autofillValues = {
      ..._autofillValues,
      ...getImplicitAutofillValues(_autofillValues),
    }

    const namesToTrue = mapValues(autofillValues, () => true)
    setValues({
      ...values,
      ...autofillValues,
      [name]: value,
    })
    setTouched({
      ...touched,
      ...namesToTrue,
    })
  } else {
    console.error(
      `expected autofills for ${name}: ${value} -- is the value missing from the autofills object?`
    )
  }
}

type HeightImgProps = {|
  labwareType: ?LabwareType,
  aluminumBlockChildType: ?string,
|}

const HeightImg = (props: HeightImgProps) => {
  const { labwareType, aluminumBlockChildType } = props
  let src = require('./images/height_plate-and-reservoir.svg')
  if (labwareType === 'tubeRack') {
    src = require('./images/height_tubeRack.svg')
  } else if (labwareType === 'aluminumBlock') {
    if (['tubes', 'pcrTubeStrip'].includes(aluminumBlockChildType)) {
      src = require('./images/height_aluminumBlock_tubes.svg')
    } else {
      src = require('./images/height_aluminumBlock_plate.svg')
    }
  }
  return <img src={src} />
}

const GridImg = () => {
  const src = require('./images/grid_row_column.svg')
  return <img src={src} />
}

const WellXYImg = (props: {| wellShape: WellShape |}) => {
  const { wellShape } = props
  let src = require('./images/wellXY_circular.svg')
  if (wellShape === 'rectangular') {
    src = require('./images/wellXY_rectangular.svg')
  }
  return <img src={src} />
}

const XYSpacingImg = (props: {|
  labwareType: ?LabwareType,
  wellShape: ?WellShape,
  gridRows: ?number,
|}) => {
  const { labwareType, wellShape, gridRows } = props
  // default to this
  let src = require('./images/spacing_plate_circular.svg')

  if (labwareType === 'reservoir') {
    if (gridRows != null && gridRows > 1) {
      src = require('./images/spacing_reservoir_multirow.svg')
    } else {
      src = require('./images/spacing_reservoir_1row.svg')
    }
  } else {
    if (wellShape === 'rectangular') {
      src = require('./images/spacing_plate_rectangular.svg')
    }
  }
  return <img src={src} />
}

type DepthImgProps = {|
  labwareType: ?LabwareType,
  wellBottomShape: ?WellBottomShape,
|}
const DepthImg = (props: DepthImgProps) => {
  const { labwareType, wellBottomShape } = props
  const defaultSrc = require('./images/depth_plate_flat.svg')
  let src

  if (!wellBottomShape) return <img src={defaultSrc} />

  if (labwareType === 'reservoir' || labwareType === 'tubeRack') {
    const imgMap = {
      v: require('./images/depth_reservoir-and-tubes_v.svg'),
      flat: require('./images/depth_reservoir-and-tubes_flat.svg'),
      round: require('./images/depth_reservoir-and-tubes_round.svg'),
    }
    src = imgMap[wellBottomShape]
  } else {
    const imgMap = {
      v: require('./images/depth_plate_v.svg'),
      flat: require('./images/depth_plate_flat.svg'),
      round: require('./images/depth_plate_round.svg'),
    }
    src = imgMap[wellBottomShape]
  }

  return <img src={src != null ? src : defaultSrc} />
}

const XYOffsetImg = (props: {|
  labwareType: ?LabwareType,
  wellShape: ?WellShape,
|}) => {
  const { labwareType, wellShape } = props
  let src = require('./images/offset_plate_circular.svg')
  if (labwareType === 'reservoir') {
    src = require('./images/offset_reservoir.svg')
  } else if (wellShape === 'rectangular') {
    src = require('./images/offset_plate_rectangular.svg')
  }
  return <img src={src} />
}

const HeightGuidingText = (props: {| labwareType: ?LabwareType |}) => {
  const { labwareType } = props
  const footer = (
    <p>
      The height measurement informs the robot of the top and bottom of your
      labware.
    </p>
  )
  if (labwareType === 'tubeRack') {
    return (
      <>
        <p>Place your tubes inside the rack.</p>
        <p>
          Reference{' '}
          <strong>from the top of the tube to bottom of the rack.</strong>{' '}
          Include any well lip. Exclude any cover or cap.
        </p>
        {footer}
      </>
    )
  }
  if (labwareType === 'aluminumBlock') {
    return (
      <>
        <p>Put your labware on top of the aluminum block.</p>
        <p>
          Reference{' '}
          <strong>
            form the top of your labware to the bottom of the block.
          </strong>{' '}
          Include any well or tube lip. Exclude any cover or cap.
        </p>
        {footer}
      </>
    )
  }
  return (
    <>
      <p>Include any well lip in the measurement. Exclude any cover or cap.</p>
      {footer}
    </>
  )
}

const displayAsTube = (values: LabwareFields) =>
  values.labwareType === 'tubeRack' ||
  (values.labwareType === 'aluminumBlock' &&
    values.aluminumBlockType === '96well' &&
    ['tubes', 'pcrTubeStrip'].includes(values.aluminumBlockChildType))

const getHeightAlerts = (
  values: LabwareFields,
  touched: { [$Keys<LabwareFields>]: boolean }
) => {
  const { labwareZDimension } = values
  const zAsNum = Number(labwareZDimension) // NOTE: if empty string or null, may be cast to 0, but that's fine for `>`
  if (touched.labwareZDimension && zAsNum > MAX_SUGGESTED_Z) {
    return (
      <AlertItem
        type="info"
        title="This labware may be too tall to work with some pipette + tip combinations. Please test on robot."
      />
    )
  }
  return null
}

const xyMessage = (
  <div>
    Our recommended footprint for labware is {SUGGESTED_X} by {SUGGESTED_Y} +/-
    1mm. If you can fit your labware snugly into a single slot on the deck
    continue through the form. If not please request custom labware via{' '}
    <LinkOut href={LINK_CUSTOM_LABWARE_FORM}>this form</LinkOut>.
  </div>
)

const getXYDimensionAlerts = (
  values: LabwareFields,
  touched: { [$Keys<LabwareFields>]: boolean }
) => {
  const xAsNum = Number(values.footprintXDimension)
  const yAsNum = Number(values.footprintYDimension)
  const showXInfo =
    touched.footprintXDimension &&
    Math.abs(xAsNum - SUGGESTED_X) > SUGGESTED_XY_RANGE
  const showYInfo =
    touched.footprintYDimension &&
    Math.abs(yAsNum - SUGGESTED_Y) > SUGGESTED_XY_RANGE

  return showXInfo || showYInfo ? (
    <AlertItem type="info" title={xyMessage} />
  ) : null
}

const App = () => {
  const [
    showExportErrorModal,
    setShowExportErrorModal,
  ] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // NOTE: the contents of this message will be overridden by modern browsers
      window.onbeforeunload = () =>
        'Are you sure you want to leave? You may have unsaved changes.'
      return () => {
        window.onbeforeunload = null
      }
    }
  })

  return (
    <LabwareCreator>
      {showExportErrorModal && (
        <AlertModal
          className={styles.export_error_modal}
          heading="Cannot export file"
          onCloseClick={() => setShowExportErrorModal(false)}
          buttons={[
            {
              onClick: () => setShowExportErrorModal(false),
              children: 'close',
            },
          ]}
        >
          Please resolve all invalid fields in order to export the labware
          definition
        </AlertModal>
      )}
      <Formik
        initialValues={getDefaultFormState()}
        validationSchema={labwareFormSchema}
        onSubmit={(values: LabwareFields) => {
          const castValues: ProcessedLabwareFields = labwareFormSchema.cast(
            values
          )
          const { pipetteName } = castValues
          const def = fieldsToLabware(castValues)
          const { displayName } = def.metadata

          const zip = new JSZip()
          zip.file(`${displayName}.json`, JSON.stringify(def, null, 4))
          zip.file(
            `calibrate_${displayName}.py`,
            labwareTestProtocol({ pipetteName, definition: def })
          )
          zip
            .generateAsync({ type: 'blob' })
            .then(blob => saveAs(blob, `${displayName}.zip`))
        }}
      >
        {({
          handleSubmit,
          values,
          isValid,
          errors,
          touched,
          setTouched,
          setValues,
        }) => (
          <div className={styles.labware_creator}>
            <h2>Custom Labware Creator</h2>
            <IntroCopy />
            <div className={styles.flex_row}>
              <div className={styles.new_definition_section}>
                <Section
                  label="Create a new definition"
                  fieldList={[
                    'labwareType',
                    'tubeRackInsertLoadName',
                    'aluminumBlockType',
                    'aluminumBlockChildType',
                  ]}
                  headingClassName={styles.setup_heading}
                >
                  <div className={styles.new_definition_content}>
                    <Dropdown name="labwareType" options={labwareTypeOptions} />
                    {values.labwareType === 'tubeRack' && (
                      <Dropdown
                        name="tubeRackInsertLoadName"
                        options={tubeRackInsertOptions}
                        onValueChange={makeAutofillOnChange({
                          name: 'tubeRackInsertLoadName',
                          autofills: tubeRackAutofills,
                          values,
                          touched,
                          setTouched,
                          setValues,
                        })}
                      />
                    )}
                    {values.labwareType === 'aluminumBlock' && (
                      <Dropdown
                        name="aluminumBlockType"
                        options={aluminumBlockTypeOptions}
                        onValueChange={makeAutofillOnChange({
                          name: 'aluminumBlockType',
                          autofills: aluminumBlockAutofills,
                          values,
                          touched,
                          setTouched,
                          setValues,
                        })}
                      />
                    )}
                    {values.labwareType === 'aluminumBlock' &&
                      values.aluminumBlockType === '96well' && (
                        // Only show for '96well' aluminum block type
                        <Dropdown
                          name="aluminumBlockChildType"
                          options={aluminumBlockChildTypeOptions}
                        />
                      )}
                  </div>
                </Section>
              </div>
              <div className={styles.upload_exisiting_section}>
                <h2 className={styles.setup_heading}>
                  Edit a file you’ve built with our labware creator.{' '}
                </h2>
              </div>
            </div>
            {/* PAGE 1 - Labware */}
            <Section label="Regularity" fieldList={['homogeneousWells']}>
              {/* tubeRackSides: Array<string> maybe?? */}
              <RadioField name="homogeneousWells" options={yesNoOptions} />
            </Section>
            <Section
              label="Footprint"
              fieldList={['footprintXDimension', 'footprintYDimension']}
              additionalAlerts={getXYDimensionAlerts(values, touched)}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>
                    Ensure measurement is taken from the{' '}
                    <strong>very bottom</strong> of plate.
                  </p>
                  <p>
                    The footprint measurement helps determine if the labware
                    fits firmly into the slots on the OT-2 deck.
                  </p>
                </div>
                <div className={styles.diagram_column}>
                  <img src={require('./images/footprint.svg')} />
                </div>
                <div className={styles.form_fields_column}>
                  <TextField
                    name="footprintXDimension"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                  <TextField
                    name="footprintYDimension"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                </div>
              </div>
            </Section>
            <Section
              label={
                ['aluminumBlock', 'tubeRack'].includes(values.labwareType)
                  ? 'Total Height'
                  : 'Height'
              }
              fieldList={['labwareZDimension']}
              additionalAlerts={getHeightAlerts(values, touched)}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <HeightGuidingText labwareType={values.labwareType} />
                </div>
                <div className={styles.diagram_column}>
                  <HeightImg
                    labwareType={values.labwareType}
                    aluminumBlockChildType={values.aluminumBlockChildType}
                  />
                </div>
                <div className={styles.form_fields_column}>
                  <TextField
                    name="labwareZDimension"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                </div>
              </div>
            </Section>
            <Section
              label="Grid"
              fieldList={[
                'gridRows',
                'gridColumns',
                'regularRowSpacing',
                'regularColumnSpacing',
              ]}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>
                    The grid of wells on your labware is arranged in a number of
                    rows (run horizontally across your labware, left to right)
                    and columns (run top to bottom).
                  </p>
                </div>
                <div className={styles.diagram_column}>
                  <GridImg />
                </div>
                <div className={styles.form_fields_column}>
                  <TextField name="gridRows" inputMasks={[maskToInteger]} />
                  <RadioField name="regularRowSpacing" options={yesNoOptions} />
                  <TextField name="gridColumns" inputMasks={[maskToInteger]} />
                  <RadioField
                    name="regularColumnSpacing"
                    options={yesNoOptions}
                  />
                </div>
              </div>
            </Section>
            {/* PAGE 2 */}
            <Section label="Volume" fieldList={['wellVolume']}>
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>Total maximum volume of each well.</p>
                </div>
                <div className={styles.form_fields_column}>
                  <TextField
                    name="wellVolume"
                    inputMasks={[maskTo2Decimal]}
                    units="μL"
                  />
                </div>
              </div>
            </Section>
            <Section
              label="Well Shape & Sides"
              fieldList={[
                'wellShape',
                'wellDiameter',
                'wellXDimension',
                'wellYDimension',
              ]}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>
                    Reference the <strong>inside</strong> of the well. Ignore
                    any lip.
                  </p>
                  <p>Diameter helps the robot locate the sides of the wells.</p>
                </div>
                <div className={styles.diagram_column}>
                  <WellXYImg wellShape={values.wellShape} />
                </div>
                <div className={styles.form_fields_column}>
                  <RadioField name="wellShape" options={wellShapeOptions} />
                  {values.wellShape === 'circular' && (
                    <TextField
                      name="wellDiameter"
                      inputMasks={[maskTo2Decimal]}
                      units="mm"
                    />
                  )}
                  {values.wellShape === 'rectangular' && (
                    <>
                      <TextField
                        name="wellXDimension"
                        inputMasks={[maskTo2Decimal]}
                        units="mm"
                      />
                      <TextField
                        name="wellYDimension"
                        inputMasks={[maskTo2Decimal]}
                        units="mm"
                      />
                    </>
                  )}
                </div>
              </div>
            </Section>
            <Section
              label="Well Bottom & Depth"
              fieldList={['wellBottomShape', 'wellDepth']}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>
                    Reference the measurement from the top of the well (include
                    any lip but exclude any cap) to the bottom of the{' '}
                    <strong>inside</strong> of the{' '}
                    {displayAsTube(values) ? 'tube' : 'well'}.
                  </p>

                  <p>
                    Depth informs the robot how far down it can go inside a
                    well.
                  </p>
                </div>
                <div className={styles.diagram_column}>
                  <DepthImg
                    labwareType={values.labwareType}
                    wellBottomShape={values.wellBottomShape}
                  />
                </div>
                <div className={styles.form_fields_column}>
                  <Dropdown
                    name="wellBottomShape"
                    options={wellBottomShapeOptions}
                  />
                  <TextField
                    name="wellDepth"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                </div>
              </div>
            </Section>
            <Section
              label="Well Spacing"
              fieldList={['gridSpacingX', 'gridSpacingY']}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>
                    Spacing is between the <strong>center</strong> of wells.
                  </p>
                  <p>
                    Well spacing measurements inform the robot how far away rows
                    and columns are from each other.
                  </p>
                </div>
                <div className={styles.diagram_column}>
                  <XYSpacingImg
                    labwareType={values.labwareType}
                    wellShape={values.wellShape}
                    gridRows={values.gridRows}
                  />
                </div>
                <div className={styles.form_fields_column}>
                  <TextField
                    name="gridSpacingX"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                  <TextField
                    name="gridSpacingY"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                </div>
              </div>
            </Section>
            <Section
              label="Grid Offset"
              fieldList={['gridOffsetX', 'gridOffsetY']}
            >
              <div className={styles.flex_row}>
                <div className={styles.instructions_column}>
                  <p>
                    Find the measurement from the center of{' '}
                    <strong>
                      {values.labwareType === 'reservoir'
                        ? 'the top left-most well'
                        : 'well A1'}
                    </strong>{' '}
                    to the edge of the labware{"'"}s footprint.
                  </p>
                  <p>
                    Corner offset informs the robot how far the grid of wells is
                    from the slot{"'"}s top left corner.
                  </p>
                  <div className={styles.help_text}>
                    <img src={require('./images/offset_helpText.svg')} />
                  </div>
                </div>
                <div className={styles.diagram_column}>
                  <XYOffsetImg
                    labwareType={values.labwareType}
                    wellShape={values.wellShape}
                  />
                </div>
                <div className={styles.form_fields_column}>
                  <TextField
                    name="gridOffsetX"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                  <TextField
                    name="gridOffsetY"
                    inputMasks={[maskTo2Decimal]}
                    units="mm"
                  />
                </div>
              </div>
            </Section>
            <Section label="Check your work">
              <div className={styles.preview_labware}>
                <ConditionalLabwareRender values={values} />
                <p>
                  Check that the size, spacing, and shape of your wells looks
                  correct.
                </p>
              </div>
            </Section>

            {/* PAGE 3 */}
            <Section label="Description" fieldList={['brand', 'brandId']}>
              <TextField name="brand" />
              <TextField name="brandId" caption="Separate multiple by comma" />
            </Section>
            {/* PAGE 4 */}
            <Section
              label="File"
              fieldList={['loadName', 'displayName', 'pipetteName']}
            >
              <TextField
                name="displayName"
                placeholder={getDefaultDisplayName(values)}
              />
              <TextField
                name="loadName"
                placeholder={getDefaultLoadName(values)}
                caption="Only lower case letters, numbers, periods, and underscores may be used"
                inputMasks={[maskLoadName]}
              />
              <Dropdown
                name="pipetteName"
                options={pipetteNameOptions}
                caption="Files are exported with a protocol that will use a single channel pipette to test whether a pipette can hit key points on your labware"
              />
            </Section>
            <div className={styles.double_check_before_exporting}>
              <p>DOUBLE CHECK YOUR WORK BEFORE EXPORTING!</p>
              <p>
                If you are not comfortable reading a JSON labware definition
                then consider noting down the values you put in these fields.
                You will not be able to re-import your file back into the
                labware creator to read or edit it.
              </p>
            </div>
            <div>
              <PrimaryButton
                className={styles.export_button}
                onClick={() => {
                  if (!isValid && !showExportErrorModal) {
                    setShowExportErrorModal(true)
                  }
                  handleSubmit()
                }}
              >
                EXPORT FILE
              </PrimaryButton>
            </div>
          </div>
        )}
      </Formik>
    </LabwareCreator>
  )
}

export default App
