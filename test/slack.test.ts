import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as _ from '../src/slack'
import * as fc from './fc'

describe('getUserFromSlack', () => {
  test('when the ID is U05BUCDTN2X', async () => {
    const actual = await _.getUserFromSlack('U05BUCDTN2X')()

    expect(actual).toStrictEqual(
      E.right({
        name: 'Daniela Saderi (she/her)',
        image: new URL('https://avatars.slack-edge.com/2023-06-27/5493277920274_7b5878dc4f15503ae153_48.jpg'),
      }),
    )
  })

  test.prop([fc.string()])('when the ID is something else', async id => {
    const actual = await _.getUserFromSlack(id)()

    expect(actual).toStrictEqual(E.left('not-found'))
  })
})
