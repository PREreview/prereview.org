import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { SaveAuthorInviteEnv } from '../../../src/author-invite.ts'
import { authorInviteDeclineMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/decline-page/index.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInviteDecline', () => {
  describe('when the form has been submitted', () => {
    test.prop([fc.uuid(), fc.declinedAuthorInvite(), fc.supportedLocale()])(
      'when the invite has already been declined',
      async (inviteId, invite, locale) => {
        const actual = await _.authorInviteDecline({ id: inviteId, locale, method: 'POST' })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        })
      },
    )

    describe('when the invite is open', () => {
      test.prop([fc.uuid(), fc.openAuthorInvite(), fc.supportedLocale()])(
        'when the invite can be saved',
        async (inviteId, invite, locale) => {
          const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

          const actual = await _.authorInviteDecline({ id: inviteId, locale, method: 'POST' })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview: shouldNotBeCalled,
            saveAuthorInvite,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
          })
          expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
        },
      )

      test.prop([fc.uuid(), fc.openAuthorInvite(), fc.supportedLocale()])(
        "when the invite can't be saved",
        async (inviteId, invite, locale) => {
          const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.left('unavailable'))

          const actual = await _.authorInviteDecline({ id: inviteId, locale, method: 'POST' })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview: shouldNotBeCalled,
            saveAuthorInvite,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
        },
      )
    })

    test.prop([
      fc.uuid(),
      fc.string().filter(method => method !== 'POST'),
      fc.declinedAuthorInvite(),
      fc.supportedLocale(),
    ])('when the invite has been declined', async (inviteId, method, invite, locale) => {
      const actual = await _.authorInviteDecline({ id: inviteId, locale, method })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
        allowRobots: false,
      })
    })
  })

  test.prop([
    fc.uuid(),
    fc.string().filter(method => method !== 'POST'),
    fc.openAuthorInvite(),
    fc.prereview(),
    fc.supportedLocale(),
  ])('when the invite is open', async (inviteId, method, invite, review, locale) => {
    const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(() => TE.right(review))

    const actual = await _.authorInviteDecline({ id: inviteId, locale, method })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview,
      saveAuthorInvite: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
      allowRobots: false,
    })
    expect(getPrereview).toHaveBeenCalledWith(invite.review)
  })

  test.prop([fc.uuid(), fc.string().filter(method => method !== 'POST'), fc.openAuthorInvite(), fc.supportedLocale()])(
    "when the review can't be loaded",
    async (inviteId, method, invite, locale) => {
      const actual = await _.authorInviteDecline({ id: inviteId, locale, method })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.left('unavailable'),
        saveAuthorInvite: shouldNotBeCalled,
      })()

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

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.authorInvite().filter(invite => invite.status !== 'open' && invite.status !== 'declined'),
    fc.supportedLocale(),
  ])('when the invite is not open or declined', async (inviteId, method, invite, locale) => {
    const actual = await _.authorInviteDecline({ id: inviteId, locale, method })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview: shouldNotBeCalled,
      saveAuthorInvite: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.uuid(), fc.string(), fc.supportedLocale()])(
    'when the invite is not found',
    async (inviteId, method, locale) => {
      const actual = await _.authorInviteDecline({ id: inviteId, locale, method })({
        getAuthorInvite: () => TE.left('not-found'),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
