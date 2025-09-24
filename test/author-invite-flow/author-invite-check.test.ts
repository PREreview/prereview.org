import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { AddAuthorToPrereviewEnv, GetPrereviewEnv } from '../../src/author-invite-flow/check-page/index.ts'
import * as _ from '../../src/author-invite-flow/index.ts'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../src/author-invite.ts'
import type { GetContactEmailAddressEnv } from '../../src/contact-email-address.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { Eq as eqOrcid } from '../../src/types/OrcidId.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('authorInvite', () => {
  describe('when the user is logged in', () => {
    describe('when the form is submitted', () => {
      test.prop([
        fc.uuid(),
        fc.user().chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.assignedAuthorInvite({
              orcid: fc.constant(user.orcid),
              persona: fc.constantFrom('public', 'pseudonym'),
            }),
          ),
        ),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.verifiedContactEmailAddress(),
        fc.supportedLocale(),
      ])('when the author can be added', async (inviteId, [user, invite], prereview, contactEmailAddress, locale) => {
        const addAuthorToPrereview = jest.fn<AddAuthorToPrereviewEnv['addAuthorToPrereview']>(_ => TE.right(undefined))
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInviteCheck({ id: inviteId, method: 'POST', user, locale })({
          addAuthorToPrereview,
          getAuthorInvite,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview,
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        })
        expect(addAuthorToPrereview).toHaveBeenCalledWith(invite.review, user, invite.persona as never)
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
        expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, {
          status: 'completed',
          orcid: invite.orcid,
          review: invite.review,
        })
      })

      test.prop([
        fc.uuid(),
        fc.user().chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.assignedAuthorInvite({
              orcid: fc.constant(user.orcid),
              persona: fc.constantFrom('public', 'pseudonym'),
            }),
          ),
        ),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.verifiedContactEmailAddress(),
        fc.supportedLocale(),
      ])("when the author can't be added", async (inviteId, [user, invite], prereview, contactEmailAddress, locale) => {
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInviteCheck({ id: inviteId, method: 'POST', user, locale })({
          addAuthorToPrereview: () => TE.left('unavailable'),
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview: () => TE.right(prereview),
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(saveAuthorInvite).toHaveBeenLastCalledWith(inviteId, invite)
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user =>
        fc.tuple(
          fc.constant(user),
          fc.assignedAuthorInvite({
            orcid: fc.constant(user.orcid),
            persona: fc.constantFrom('public', 'pseudonym'),
          }),
        ),
      ),
      fc.string().filter(method => method !== 'POST'),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.verifiedContactEmailAddress(),
      fc.supportedLocale(),
    ])(
      'when the form needs checking',
      async (inviteId, [user, invite], method, prereview, contactEmailAddress, locale) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteCheckMatch.formatter, { id: inviteId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['single-use-form.js'],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user =>
        fc.tuple(
          fc.constant(user),
          fc.assignedAuthorInvite({
            orcid: fc.constant(user.orcid),
            persona: fc.constantFrom('public', 'pseudonym'),
          }),
        ),
      ),
      fc.string(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
      fc.supportedLocale(),
    ])(
      "when there isn't a verified email address",
      async (inviteId, [user, invite], method, prereview, contactEmailAddress, locale) => {
        const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.fromEither(contactEmailAddress),
        )

        const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress,
          getPrereview: () => TE.right(prereview),
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
        })
        expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user =>
        fc.tuple(
          fc.constant(user),
          fc.assignedAuthorInvite({
            orcid: fc.constant(user.orcid),
            persona: fc.constant(undefined),
          }),
        ),
      ),
      fc.string().filter(method => method !== 'POST'),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.supportedLocale(),
    ])('when the invite is incomplete', async (inviteId, [user, invite], method, prereview, locale) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: () => TE.right(prereview),
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string(),
      fc.supportedLocale(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], method, locale) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.supportedLocale()])(
      'when the invite cannot be loaded',
      async (inviteId, user, method, locale) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.left('unavailable'),
          getContactEmailAddress: shouldNotBeCalled,
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
      fc.string(),
      fc.supportedLocale(),
    ])('when the invite is already complete', async (inviteId, [user, invite], method, locale) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
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
        .filter(([user, invite]) => !eqOrcid.equals(user.orcid, invite.orcid)),
      fc.string(),
      fc.supportedLocale(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], method, locale) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.openAuthorInvite(), fc.supportedLocale()])(
      'when the invite is not assigned',
      async (inviteId, user, method, invite, locale) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.declinedAuthorInvite(), fc.supportedLocale()])(
      'when the invite has been declined',
      async (inviteId, user, method, invite, locale) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.supportedLocale()])(
      'when the invite is not found',
      async (inviteId, user, method, locale) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user, locale })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.left('not-found'),
          getContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.uuid(), fc.string(), fc.authorInvite(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (inviteId, method, invite, locale) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, locale })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
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
