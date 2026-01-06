import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/connect-orcid/oauth-error.ts'
import * as fc from '../../fc.ts'

describe('connectOrcidError', () => {
  test.prop([fc.supportedLocale()])('with an access_denied error', locale => {
    const actual = _.connectOrcidError({ error: 'access_denied', locale })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.Forbidden,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.string().filter(string => string !== 'access_denied'), fc.supportedLocale()])(
    'with an unknown error',
    (error, locale) => {
      const actual = _.connectOrcidError({ error, locale })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
