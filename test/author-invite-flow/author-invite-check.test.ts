import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/author-invite-check'
import { authorInviteCheckMatch, authorInviteMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInvite', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.uuid(),
      fc.user(),
      fc.assignedAuthorInvite(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when the form is submitted', async (inviteId, user, invite, prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInviteCheck({ id: inviteId, method: 'POST', user })({
        getAuthorInvite,
        getPrereview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([
      fc.uuid(),
      fc.user(),
      fc.string().filter(method => method !== 'POST'),
      fc.assignedAuthorInvite(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when the form needs checking', async (inviteId, user, method, invite, prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
        getAuthorInvite,
        getPrereview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInviteCheckMatch.formatter, { id: inviteId }),
        status: Status.OK,
        title: expect.stringContaining('Check your details'),
        main: expect.stringContaining('Check your details'),
        skipToLabel: 'form',
        js: [],
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.assignedAuthorInvite()])(
      'when the review cannot be loaded',
      async (inviteId, user, method, invite) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
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
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.string()])(
      'when the invite cannot be loaded',
      async (inviteId, user, method) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
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
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, method, invite) => {
        const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
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

    test.prop([fc.uuid(), fc.user(), fc.string()])('when the invite is not found', async (inviteId, user, method) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method, user })({
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

  test.prop([fc.uuid(), fc.string(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, method, invite) => {
      const actual = await _.authorInviteCheck({ id: inviteId, method })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInviteMatch.formatter, { id: inviteId }),
      })
    },
  )
})
