// @flow
import makeFieldUpdater from '../makeFieldUpdater'

describe('makeFieldUpdater', () => {
  const foodUpdateMap = [
    {
      prevKeyValue: 'apple',
      nextKeyValue: 'banana',
      fields: [
        {name: 'color', prev: 'red', next: 'yellow'},
        {name: 'flavor', prev: 'sour', next: 'sweet'},
      ],
    },
  ]
  const updateForFood = makeFieldUpdater(foodUpdateMap)
  test('unhandled key field values case', () => {
    expect(updateForFood('blorg', 'zvvvvvvargh', {spam: 'blah'})).toEqual({})
  })
  test('no dependent fields cases', () => {
    expect(updateForFood('apple', 'banana', {})).toEqual({})
    expect(updateForFood('apple', 'banana', {nonUpdatedField: 'foo'})).toEqual({})
  })
  test('avoid updating fields that should not get updated', () => {
    // all values in update don't need secondary update
    expect(
      updateForFood('apple', 'banana', {color: 'yellow', flavor: 'sweet', origin: 'Spain'})
    ).toEqual({})
    // one value needs secondary update, other doesn't
    expect(
      updateForFood('apple', 'banana', {color: 'red', flavor: 'sweet', origin: 'Spain'})
    ).toEqual({color: 'yellow'})
  })
  test('update multiple fields together correctly', () => {
    expect(
      updateForFood('apple', 'banana', {color: 'red', flavor: 'sour', origin: 'Spain'})
    ).toEqual({color: 'yellow', flavor: 'sweet'})
  })
})
