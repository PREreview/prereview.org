import { describe, expect, it } from '@effect/vitest'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/connect-orcid/oauth-error.ts'
import * as fc from '../../fc.ts'

describe('connectOrcidError', () => {
  it.prop('with an access_denied error', [fc.supportedLocale()], ([locale]) => {
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

  it.prop(
    'with an unknown error',
    [fc.string().filter(string => string !== 'access_denied'), fc.supportedLocale()],
    ([error, locale]) => {
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
