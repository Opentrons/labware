// @flow
// app tests
import * as React from 'react'
import Renderer from 'react-test-renderer'

import {App} from '..'

// unable to test render React.lazy; not sure why
jest.mock('../LazyPage', () => props => `LazyPage(${JSON.stringify(props)})`)

describe('App', () => {
  test('component renders', () => {
    const tree = Renderer.create(
      <App
        location={({search: ''}: any)}
        history={({}: any)}
        match={({}: any)}
      />
    ).toJSON()

    expect(tree).toMatchSnapshot()
  })
})
