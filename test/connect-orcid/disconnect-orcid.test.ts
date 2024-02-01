import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/disconnect-orcid'
import type { GetOrcidTokenEnv } from '../../src/orcid-token'
import { disconnectOrcidMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('disconnectOrcid', () => {
  describe('when the user is logged in', () => {
    describe('when ORCID is connected', () => {
      test.prop([fc.user(), fc.orcidToken()])('when the form is submitted', async (user, orcidToken) => {
        const actual = await _.disconnectOrcid({ method: 'POST', user })({
          getOrcidToken: () => TE.right(orcidToken),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      })

      test.prop([fc.user(), fc.string().filter(string => string !== 'POST'), fc.orcidToken()])(
        'when the form is ready',
        async (user, method, orcidToken) => {
          const actual = await _.disconnectOrcid({ method, user })({
            getOrcidToken: () => TE.right(orcidToken),
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(disconnectOrcidMatch.formatter, {}),
            status: Status.OK,
            title: expect.stringContaining('Disconnect'),
            main: expect.stringContaining('disconnect'),
            skipToLabel: 'form',
            js: [],
          })
        },
      )
    })

    test.prop([fc.user(), fc.string()])('when ORCID is not already connected', async (user, method) => {
      const getOrcidToken = jest.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

      const actual = await _.disconnectOrcid({ method, user })({
        getOrcidToken,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(getOrcidToken).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([fc.user(), fc.string()])("when we can't load the ORCID token", async (user, method) => {
      const actual = await _.disconnectOrcid({ method, user })({
        getOrcidToken: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.string()])('when the user is not logged in', async method => {
    const actual = await _.disconnectOrcid({ method })({
      getOrcidToken: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(disconnectOrcidMatch.formatter, {}),
    })
  })
})
