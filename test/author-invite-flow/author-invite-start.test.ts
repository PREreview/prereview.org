import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/author-invite-start.js'
import * as _ from '../../src/author-invite-flow/index.js'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../src/author-invite.js'
import { DefaultLocale } from '../../src/locales/index.js'
import {
  authorInviteDeclineMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
} from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('authorInviteStart', () => {
  describe('when the review can be loaded', () => {
    describe('the user is logged in', () => {
      test.prop([
        fc.uuid(),
        fc.user(),
        fc.openAuthorInvite(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ])('the invite is open', async (inviteId, user, invite, prereview) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
          getAuthorInvite,
          getPrereview,
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
        expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, {
          status: 'assigned',
          emailAddress: invite.emailAddress,
          orcid: user.orcid,
          review: invite.review,
        })
      })

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ])('the invite is already assigned to the user', async (inviteId, [user, invite], prereview) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
          getAuthorInvite,
          getPrereview,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteStartMatch.formatter, { id: inviteId }),
          status: Status.OK,
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
          .tuple(fc.user(), fc.oneof(fc.assignedAuthorInvite(), fc.completedAuthorInvite()))
          .filter(([user, invite]) => !eqOrcid.equals(user.orcid, invite.orcid)),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ])('the invite is already assigned to someone else', async (inviteId, [user, invite], prereview) => {
        const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: () => TE.right(prereview),
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.Forbidden,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      })

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ])('the invite is already completed', async (inviteId, [user, invite], prereview) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
          getAuthorInvite,
          getPrereview,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      })
    })

    test.prop([
      fc.uuid(),
      fc.authorInvite().filter(invite => invite.status !== 'declined'),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('the user is logged not in', async (inviteId, invite, prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInviteStart({ id: inviteId, locale: DefaultLocale })({
        getAuthorInvite,
        getPrereview,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInviteStartMatch.formatter, { id: inviteId }),
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })
  })

  test.prop([
    fc.uuid(),
    fc.option(fc.user(), { nil: undefined }),
    fc.authorInvite().filter(invite => invite.status !== 'declined'),
  ])('when the review cannot be loaded', async (inviteId, user, invite) => {
    const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview: () => TE.left('unavailable'),
      saveAuthorInvite: shouldNotBeCalled,
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

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.declinedAuthorInvite()])(
    'when the invite has been declined',
    async (inviteId, user, invite) => {
      const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
      })
    },
  )

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined })])(
    'when the invite cannot be loaded',
    async (inviteId, user) => {
      const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
        getAuthorInvite: () => TE.left('unavailable'),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined })])(
    'when the invite is not found',
    async (inviteId, user) => {
      const actual = await _.authorInviteStart({ id: inviteId, user, locale: DefaultLocale })({
        getAuthorInvite: () => TE.left('not-found'),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
