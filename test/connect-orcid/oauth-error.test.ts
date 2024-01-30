import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/oauth-error'
import * as fc from '../fc'

describe('connectOrcidError', () => {
  test('with an access_denied error', () => {
    const actual = _.connectOrcidError({ error: 'access_denied' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.Forbidden,
      title: expect.stringContaining('can’t connect'),
      main: expect.stringContaining('can’t connect'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.string().filter(string => string !== 'access_denied')])('with an unknown error', error => {
    const actual = _.connectOrcidError({ error })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('having problem'),
      main: expect.stringContaining('unable to connect'),
      skipToLabel: 'main',
      js: [],
    })
  })
})
