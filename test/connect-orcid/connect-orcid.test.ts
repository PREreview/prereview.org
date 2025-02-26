import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/connect-orcid.js'
import type { GetOrcidTokenEnv } from '../../src/orcid-token.js'
import { connectOrcidMatch, connectOrcidStartMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('connectOrcid', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user()])('when ORCID is not already connected', async user => {
      const getOrcidToken = jest.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

      const actual = await _.connectOrcid({ user })({
        getOrcidToken,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(connectOrcidMatch.formatter, {}),
        status: Status.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getOrcidToken).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([fc.user(), fc.orcidToken()])('when ORCID is connected', async (user, orcidToken) => {
      const actual = await _.connectOrcid({ user })({
        getOrcidToken: () => TE.right(orcidToken),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(connectOrcidStartMatch.formatter, {}),
      })
    })

    test.prop([fc.user()])("when we can't load the ORCID token", async user => {
      const actual = await _.connectOrcid({ user })({
        getOrcidToken: () => TE.left('unavailable'),
      })()

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

  test('when the user is not logged in', async () => {
    const actual = await _.connectOrcid({})({
      getOrcidToken: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
