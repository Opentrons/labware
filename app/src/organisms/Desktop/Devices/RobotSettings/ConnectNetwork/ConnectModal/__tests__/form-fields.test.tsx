import * as Fixtures from '/app/redux/networking/__fixtures__'
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { useTranslation } from 'react-i18next'

import {
  SECURITY_WPA_EAP,
  SECURITY_WPA_PSK,
  SECURITY_NONE,
} from '/app/redux/networking'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import {
  getConnectFormFields,
  validateConnectFormFields,
  connectFormToConfigureRequest,
} from '../form-fields'

import type { FieldError } from 'react-hook-form'
import type {
  WifiNetwork,
  WifiKey,
  EapOption,
  ConnectFormValues,
} from '../../types'
import type { ComponentProps } from 'react'

const TestWrapperConnectFormFields = ({
  network,
  robotName,
  eapOptions,
  wifiKeys,
  values,
}: {
  network: WifiNetwork | null
  robotName: string
  eapOptions: EapOption[]
  wifiKeys: WifiKey[]
  values: ConnectFormValues
}) => {
  const { t } = useTranslation('device_settings')
  const fields = getConnectFormFields(
    network,
    robotName,
    eapOptions,
    wifiKeys,
    values,
    t
  )
  return <div>{JSON.stringify(fields)}</div>
}

const renderConnectFormFields = (
  props: ComponentProps<typeof TestWrapperConnectFormFields>
) => {
  return renderWithProviders(<TestWrapperConnectFormFields {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('getConnectFormFields', () => {
  it('should add a string field for SSID if network is unknown', () => {
    const props = {
      network: null,
      robotName: 'robot-name',
      eapOptions: [],
      wifiKeys: [],
      values: {},
    }
    renderConnectFormFields(props)
    screen.getByText(/text/)
    screen.getByText(/ssid/)
    screen.getByText(/ * Network Name/)
  })

  it('should add a security dropdown field if network is unknown', () => {
    const props = {
      network: null,
      robotName: 'robot-name',
      eapOptions: [Fixtures.mockEapOption],
      wifiKeys: [],
      values: {},
    }
    renderConnectFormFields(props)
    screen.getByText(/security/)
    screen.getByText(/ * Authentication/)
    screen.getByText(/Select authentication method/)
  })

  it('should add a security dropdown field if known network has EAP security', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      securityType: SECURITY_WPA_EAP,
    }
    const props = {
      network: network,
      robotName: 'robot-name',
      eapOptions: [Fixtures.mockEapOption],
      wifiKeys: [],
      values: {},
    }
    renderConnectFormFields(props)

    screen.getByText(/security/)
    screen.getByText(/ * Authentication/)
    screen.getByText(/Select authentication method/)
    screen.getByText(/EAP Option/)
    screen.getByText(/String Field/)
    screen.getByText(/Password Field/)
    screen.getByText(/File Field/)
  })

  it('should add a password field for PSK if known network as PSK security', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      securityType: SECURITY_WPA_PSK,
    }
    const props = {
      network: network,
      robotName: 'robot-name',
      eapOptions: [],
      wifiKeys: [],
      values: {},
    }
    renderConnectFormFields(props)

    screen.getByText(/psk/)
    screen.getByText(/ * Password/)
  })

  it('should add a password field for PSK if unknown network and user selects PSK', () => {
    const props = {
      network: null,
      robotName: 'robot-name',
      eapOptions: [],
      wifiKeys: [],
      values: { securityType: SECURITY_WPA_PSK },
    }

    renderConnectFormFields(props)
    screen.getByText(/psk/)
    screen.getByText(/ * Password/)
  })

  it('should add EAP options based on the selected eapType if network is unknown', () => {
    const eapOptions = [
      { ...Fixtures.mockEapOption, name: 'someEapType', options: [] },
      { ...Fixtures.mockEapOption, name: 'someOtherEapType' },
    ]
    const wifiKeys = [Fixtures.mockWifiKey]
    const props = {
      network: null,
      robotName: 'robot-name',
      eapOptions: eapOptions,
      wifiKeys: wifiKeys,
      values: {},
    }
    renderConnectFormFields(props)

    screen.getByText(/someEapType/)
    screen.getByText(/someOtherEapType/)
    screen.getByText(/stringField/)
    screen.getByText(/String Field/)
    screen.getByText(/passwordField/)
    screen.getByText(/Password Field/)
    screen.getByText(/fileField/)
    screen.getByText(/File Field/)
  })

  it('should add EAP options based on the selected eapType if network is EAP', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      securityType: SECURITY_WPA_EAP,
    }
    const eapOptions = [
      { ...Fixtures.mockEapOption, name: 'someEapType' },
      { ...Fixtures.mockEapOption, name: 'someOtherEapType', options: [] },
    ]
    const wifiKeys = [Fixtures.mockWifiKey]
    const props = {
      network: network,
      robotName: 'robot-name',
      eapOptions: eapOptions,
      wifiKeys: wifiKeys,
      values: { securityType: 'someEapType' },
    }
    renderConnectFormFields(props)
    screen.getByText(/ * String Field/)
    screen.getByText(/Password Field/)
    screen.getByText(/ * File Field/)
  })
})

const TestWrapperValidateFormFields = ({
  network,
  eapOptions,
  values,
  errors,
}: {
  network: WifiNetwork | null
  eapOptions: EapOption[]
  values: ConnectFormValues
  errors: Record<string, FieldError>
}) => {
  const { t } = useTranslation('device_settings')
  const validationErrors = validateConnectFormFields(
    network,
    eapOptions,
    values,
    errors,
    t
  )
  return <div>{JSON.stringify(validationErrors)}</div>
}

const renderValidateFormFields = (
  props: ComponentProps<typeof TestWrapperValidateFormFields>
) => {
  return renderWithProviders(<TestWrapperValidateFormFields {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('validateConnectFormFields', () => {
  it('should error if network is hidden and ssid is blank', () => {
    const props = {
      network: null,
      eapOptions: [],
      values: {
        securityType: SECURITY_WPA_PSK,
        psk: '12345678',
      },
      errors: {},
    }
    renderValidateFormFields(props)
    screen.getByText(/ssid/)
    screen.getByText(/ssidError/)
    screen.getByText(/Network Name is required/)
  })

  it('should error if network is hidden and securityType is blank', () => {
    const props = {
      network: null,
      eapOptions: [],
      values: {
        ssid: 'foobar',
      },
      errors: {},
    }
    renderValidateFormFields(props)
    screen.getByText(/securityType/)
    screen.getByText(/securityTypeError/)
    screen.getByText(/Authentication is required/)
  })

  it('should error if network is PSK and psk is blank', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      securityType: SECURITY_WPA_PSK,
    }
    const props = {
      network: network,
      eapOptions: [],
      values: {
        psk: '',
      },
      errors: {},
    }
    renderValidateFormFields(props)
    screen.getByText(/psk/)
    screen.getByText(/pskError/)
    screen.getByText(/Password must be at least 8 characters/)
  })

  it('should error if selected security is PSK and psk is blank', () => {
    const values = { ssid: 'foobar', securityType: SECURITY_WPA_PSK }
    const props = {
      network: null,
      eapOptions: [],
      values: values,
      errors: {},
    }
    renderValidateFormFields(props)
    screen.getByText(/psk/)
    screen.getByText(/pskError/)
    screen.getByText(/Password must be at least 8 characters/)
  })

  it('should error if network is EAP and securityType is blank', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      securityType: SECURITY_WPA_EAP,
    }
    const props = {
      network: network,
      eapOptions: [],
      values: {},
      errors: {},
    }

    renderValidateFormFields(props)
    screen.getByText(/securityType/)
    screen.getByText(/securityTypeError/)
    screen.getByText(/Authentication is required/)
  })

  it('should error if any required EAP fields are missing', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      securityType: SECURITY_WPA_EAP,
    }
    const eapOptions = [
      { ...Fixtures.mockEapOption, name: 'someEapType', options: [] },
      { ...Fixtures.mockEapOption, name: 'someOtherEapType' },
    ]
    const values = {
      securityType: 'someOtherEapType',
      eapConfig: { fileField: '123' },
    }
    const props = {
      network: network,
      eapOptions: eapOptions,
      values: values,
      errors: {},
    }

    renderValidateFormFields(props)
    screen.getByText(/eapConfig.stringField/)
    screen.getByText(/eapError/)
    screen.getByText(/String Field is required/)
  })
})

describe('connectFormToConfigureRequest', () => {
  it('should return null if unknown network and no ssid', () => {
    const values = { securityType: SECURITY_NONE }
    const result = connectFormToConfigureRequest(null, values)

    expect(result).toEqual(null)
  })

  it('should set ssid and securityType from values if unknown network', () => {
    const values = { ssid: 'foobar', securityType: SECURITY_NONE }
    const result = connectFormToConfigureRequest(null, values)

    expect(result).toEqual({
      ssid: 'foobar',
      securityType: SECURITY_NONE,
      hidden: true,
    })
  })

  it('should set ssid from network if known', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      ssid: 'foobar',
      securityType: SECURITY_NONE,
    }
    const values = {}
    const result = connectFormToConfigureRequest(network, values)

    expect(result).toEqual({
      ssid: 'foobar',
      securityType: SECURITY_NONE,
      hidden: false,
    })
  })

  it('should set psk from values', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      ssid: 'foobar',
      securityType: SECURITY_WPA_PSK,
    }
    const values = { psk: '12345678' }
    const result = connectFormToConfigureRequest(network, values)

    expect(result).toEqual({
      ssid: 'foobar',
      securityType: SECURITY_WPA_PSK,
      hidden: false,
      psk: '12345678',
    })
  })

  it('should set eapConfig from values with known network', () => {
    const network = {
      ...Fixtures.mockWifiNetwork,
      ssid: 'foobar',
      securityType: SECURITY_WPA_EAP,
    }
    const values = {
      securityType: 'someEapType',
      eapConfig: { option1: 'fizzbuzz' },
    }
    const result = connectFormToConfigureRequest(network, values)

    expect(result).toEqual({
      ssid: 'foobar',
      securityType: SECURITY_WPA_EAP,
      hidden: false,
      eapConfig: { eapType: 'someEapType', option1: 'fizzbuzz' },
    })
  })

  it('should set eapConfig from values with unknown network', () => {
    const values = {
      ssid: 'foobar',
      securityType: 'someEapType',
      eapConfig: { option1: 'fizzbuzz' },
    }
    const result = connectFormToConfigureRequest(null, values)

    expect(result).toEqual({
      ssid: 'foobar',
      securityType: SECURITY_WPA_EAP,
      hidden: true,
      eapConfig: { eapType: 'someEapType', option1: 'fizzbuzz' },
    })
  })
})
