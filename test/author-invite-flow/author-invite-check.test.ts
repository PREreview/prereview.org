import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow'
import type { AddAuthorToPrereviewEnv, GetPrereviewEnv } from '../../src/author-invite-flow/check-page'
import {
  authorInviteCheckMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

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
      ])('when the author can be added', async (inviteId, [user, invite], prereview) => {
        const addAuthorToPrereview = jest.fn<AddAuthorToPrereviewEnv['addAuthorToPrereview']>(_ => TE.right(undefined))
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInviteCheck({ id: inviteId, method: 'POST', user })({
          addAuthorToPrereview,
          getAuthorInvite,
          getPrereview,
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        })
        expect(addAuthorToPrereview).toHaveBeenCalledWith(invite.review, user, 'public')
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
      ])("when the author can't be added", async (inviteId, [user, invite], prereview) => {
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInviteCheck({ id: inviteId, method: 'POST', user })({
          addAuthorToPrereview: () => TE.left('unavailable'),
          getAuthorInvite: () => TE.right(invite),
          getPrereview: () => TE.right(prereview),
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('unable to'),
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
    ])('when the form needs checking', async (inviteId, [user, invite], method, prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite,
        getPrereview,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInviteCheckMatch.formatter, { id: inviteId }),
        status: Status.OK,
        title: expect.stringContaining('Check your details'),
        main: expect.stringContaining('Check your details'),
        skipToLabel: 'form',
        js: ['single-use-form.js'],
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

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
    ])('when the invite is incomplete', async (inviteId, [user, invite], method, prereview) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.right(prereview),
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], method) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.left('unavailable'),
        saveAuthorInvite: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.string()])(
      'when the invite cannot be loaded',
      async (inviteId, user, method) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.left('unavailable'),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
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
    ])('when the invite is already complete', async (inviteId, [user, invite], method) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.user(), fc.assignedAuthorInvite())
        .filter(([user, invite]) => !eqOrcid.equals(user.orcid, invite.orcid)),
      fc.string(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], method) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.Forbidden,
        title: expect.stringContaining('do not have permission'),
        main: expect.stringContaining('do not have permission'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, method, invite) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
          addAuthorToPrereview: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.string()])('when the invite is not found', async (inviteId, user, method) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        addAuthorToPrereview: shouldNotBeCalled,
        getAuthorInvite: () => TE.left('not-found'),
        getPrereview: shouldNotBeCalled,
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.uuid(), fc.string(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, method, invite) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method })({
        addAuthorToPrereview: shouldNotBeCalled,
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
