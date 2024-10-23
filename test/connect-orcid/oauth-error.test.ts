import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/oauth-error.js'
import * as fc from '../fc.js'

describe('connectOrcidError', () => {
  test('with an access_denied error', () => {
    const actual = _.connectOrcidError({ error: 'access_denied' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.Forbidden,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.string().filter(string => string !== 'access_denied')])('with an unknown error', error => {
    const actual = _.connectOrcidError({ error })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
