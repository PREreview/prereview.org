import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/author-invite-published'
import { authorInviteCheckMatch, authorInviteMatch, authorInvitePublishedMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

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
    ])('when the invite is complete', async (inviteId, [user, invite], prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInvitePublished({ id: inviteId, user })({
        getAuthorInvite,
        getPrereview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        status: Status.OK,
        title: expect.stringContaining('Name added'),
        main: expect.stringContaining('Name added'),
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
    ])('when the review cannot be loaded', async (inviteId, [user, invite]) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.left('unavailable'),
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

    test.prop([fc.uuid(), fc.user()])('when the invite cannot be loaded', async (inviteId, user) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user })({
        getAuthorInvite: () => TE.left('unavailable'),
        getPrereview: shouldNotBeCalled,
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

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string(),
    ])('when the invite is not yet complete', async (inviteId, [user, invite]) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.oneof(fc.assignedAuthorInvite(), fc.completedAuthorInvite())])(
      'when the invite is assigned to someone else',
      async (inviteId, user, invite) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.Forbidden,
          title: expect.stringContaining('do not have permission'),
          main: expect.stringContaining('do not have permission'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, invite) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, user, invite) => {
        const actual = await _.authorInvitePublished({ id: inviteId, user })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.uuid(), fc.user()])('when the invite is not found', async (inviteId, user) => {
      const actual = await _.authorInvitePublished({ id: inviteId, user })({
        getAuthorInvite: () => TE.left('not-found'),
        getPrereview: shouldNotBeCalled,
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

  test.prop([fc.uuid(), fc.authorInvite()])('when the user is not logged in', async (inviteId, invite) => {
    const actual = await _.authorInvitePublished({ id: inviteId })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
    })
  })
})
