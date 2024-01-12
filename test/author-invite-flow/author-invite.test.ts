import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/author-invite'
import { authorInviteMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInvite', () => {
  test.prop([
    fc.uuid(),
    fc.option(fc.user(), { nil: undefined }),
    fc.authorInvite(),
    fc.record({
      preprint: fc.record({
        language: fc.languageCode(),
        title: fc.html(),
      }),
    }),
  ])('when the review can be loaded', async (inviteId, user, invite, prereview) => {
    const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
    const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

    const actual = await _.authorInvite({ id: inviteId, user })({
      getAuthorInvite,
      getPrereview,
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(authorInviteMatch.formatter, { id: inviteId }),
      status: Status.OK,
      title: expect.stringContaining('Be listed as an author'),
      main: expect.stringContaining('Be listed as an author'),
      skipToLabel: 'main',
      js: [],
    })
    expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
    expect(getPrereview).toHaveBeenCalledWith(invite.review)
  })

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.authorInvite()])(
    'when the review cannot be loaded',
    async (inviteId, user, invite) => {
      const actual = await _.authorInvite({ id: inviteId, user })({
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

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined })])(
    'when the invite cannot be loaded',
    async (inviteId, user) => {
      const actual = await _.authorInvite({ id: inviteId, user })({
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

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined })])(
    'when the invite is not found',
    async (inviteId, user) => {
      const actual = await _.authorInvite({ id: inviteId, user })({
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
    },
  )
})
