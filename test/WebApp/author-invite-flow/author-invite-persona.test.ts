import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/check-page/index.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInvitePersona', () => {
  describe('when the user is logged in', () => {
    describe('when the form is submitted', () => {
      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.constantFrom('public', 'pseudonym'),
      ])('when the persona is set', async (inviteId, [user, invite], locale, prereview, persona) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInvitePersona({ body: { persona }, id: inviteId, locale, method: 'POST', user })({
          getAuthorInvite,
          getPrereview,
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
        expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { ...invite, persona })
      })

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.constantFrom('public', 'pseudonym'),
      ])("when the persona can't be set", async (inviteId, [user, invite], locale, prereview, persona) => {
        const actual = await _.authorInvitePersona({ body: { persona }, id: inviteId, locale, method: 'POST', user })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: () => TE.right(prereview),
          saveAuthorInvite: () => TE.left('unavailable'),
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
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.anything(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when the form is invalid', async (inviteId, [user, invite], locale, body, prereview) => {
      const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method: 'POST', user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.right(prereview),
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.string().filter(method => method !== 'POST'),
      fc.anything(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when the form needs submitting', async (inviteId, [user, invite], locale, method, body, prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
        getAuthorInvite,
        getPrereview,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.string(),
      fc.anything(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], locale, method, body) => {
      const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
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
    })

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything()])(
      'when the invite cannot be loaded',
      async (inviteId, user, locale, method, body) => {
        const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
          getAuthorInvite: () => TE.left('unavailable'),
          getPrereview: shouldNotBeCalled,
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
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.string(),
      fc.anything(),
    ])('when the invite is already complete', async (inviteId, [user, invite], locale, method, body) => {
      const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.user(), fc.assignedAuthorInvite())
        .filter(([user, invite]) => !OrcidIdEquivalence(user.orcid, invite.orcid)),
      fc.supportedLocale(),
      fc.string(),
      fc.anything(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], locale, method, body) => {
      const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, locale, method, body, invite) => {
        const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything(), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, user, locale, method, body, invite) => {
        const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
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

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything()])(
      'when the invite is not found',
      async (inviteId, user, locale, method, body) => {
        const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
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

  test.prop([fc.uuid(), fc.supportedLocale(), fc.string(), fc.anything(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, locale, method, body, invite) => {
      const actual = await _.authorInvitePersona({ body, id: inviteId, locale, method })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInviteMatch.formatter, { id: inviteId }),
      })
    },
  )
})
