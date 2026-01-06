import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/author-invite-published.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInvite', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.record({
        doi: fc.doi(),
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.supportedLocale(),
    ])('when the invite is complete', async (inviteId, [user, invite], prereview, locale) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
        getAuthorInvite,
        getPrereview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], locale) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      'when the invite cannot be loaded',
      async (inviteId, user, locale) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
          getAuthorInvite: () => TE.left('unavailable'),
          getPrereview: shouldNotBeCalled,
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
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
    ])('when the invite is not yet complete', async (inviteId, [user, invite], locale) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc.user(),
      fc.oneof(fc.assignedAuthorInvite(), fc.completedAuthorInvite()),
      fc.supportedLocale(),
    ])('when the invite is assigned to someone else', async (inviteId, user, invite, locale) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.Forbidden,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.openAuthorInvite(), fc.supportedLocale()])(
      'when the invite is not assigned',
      async (inviteId, user, invite, locale) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.declinedAuthorInvite(), fc.supportedLocale()])(
      'when the invite has been declined',
      async (inviteId, user, invite, locale) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      'when the invite is not found',
      async (inviteId, user, locale) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user, locale })({
          getAuthorInvite: () => TE.left('not-found'),
          getPrereview: shouldNotBeCalled,
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

  test.prop([fc.uuid(), fc.authorInvite(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (inviteId, invite, locale) => {
      const actual = await _.authorInvitePublished({ id: inviteId, locale })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
      })
    },
  )
})
