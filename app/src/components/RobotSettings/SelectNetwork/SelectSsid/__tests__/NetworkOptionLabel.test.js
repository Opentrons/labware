// @flow
import * as React from 'react'
import { shallow } from 'enzyme'

import * as Fixtures from '../../../../../networking/__fixtures__'
import { SECURITY_NONE } from '../../../../../networking'

import { NetworkOptionLabel } from '../NetworkOptionLabel'
import {
  SIGNAL_LEVEL_LOW,
  SIGNAL_LEVEL_MED,
  SIGNAL_LEVEL_HIGH,
} from '../constants'

describe('NetworkOptionLabel presentational component', () => {
  let props
  const render = () => shallow(<NetworkOptionLabel {...props} />)

  beforeEach(() => {
    props = Fixtures.mockWifiNetwork
  })

  it('renders the ssid of the network', () => {
    const wrapper = render()

    expect(wrapper.html()).toContain(props.ssid)
  })

  it('renders the security icon if network has security', () => {
    const wrapper = render()
    const icon = wrapper.find('Icon[name="lock"]')
    expect(icon).toHaveLength(1)
  })

  it('renders no security icon if network has no security', () => {
    props = { ...props, securityType: SECURITY_NONE }
    const wrapper = render()
    const icon = wrapper.find('Icon[name="lock"]')
    expect(icon).toHaveLength(0)
  })

  it('renders a check icon if network is active', () => {
    props = { ...props, active: true }

    const wrapper = render()
    const icon = wrapper.find('Icon[name="check"]')
    expect(icon).toHaveLength(1)
  })

  it('renders no check icon if network is not active', () => {
    props = { ...props, active: false }
    const wrapper = render()
    const icon = wrapper.find('Icon[name="check"]')
    expect(icon).toHaveLength(0)
  })

  it('renders very low signal icon when props.signal is very low', () => {
    props = { ...props, signal: SIGNAL_LEVEL_LOW - 1 }
    const wrapper = render()
    const icon = wrapper.find('Icon[name="ot-wifi-0"]')
    expect(icon).toHaveLength(1)
  })

  it('renders low signal icon when props.signal is "low"', () => {
    props = { ...props, signal: SIGNAL_LEVEL_MED - 1 }
    const wrapper = render()
    const icon = wrapper.find('Icon[name="ot-wifi-1"]')
    expect(icon).toHaveLength(1)
  })

  it('renders medium signal icon when props.signal is "medium"', () => {
    props = { ...props, signal: SIGNAL_LEVEL_HIGH - 1 }
    const wrapper = render()
    const icon = wrapper.find('Icon[name="ot-wifi-2"]')
    expect(icon).toHaveLength(1)
  })

  it('renders high signal icon when props.signal is "high"', () => {
    props = { ...props, signal: SIGNAL_LEVEL_HIGH + 1 }
    const wrapper = render()
    const icon = wrapper.find('Icon[name="ot-wifi-3"]')
    expect(icon).toHaveLength(1)
  })
})
