import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { SaveAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/decline-page'
import { authorInviteDeclineMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInviteDecline', () => {
  describe('when the form has been submitted', () => {
    test.prop([fc.uuid(), fc.declinedAuthorInvite()])(
      'when the invite has already been declined',
      async (inviteId, invite) => {
        const actual = await _.authorInviteDecline({ id: inviteId, method: 'POST' })({
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

    describe('when the invite is open', () => {
      test.prop([fc.uuid(), fc.openAuthorInvite()])('when the invite can be saved', async (inviteId, invite) => {
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

        const actual = await _.authorInviteDecline({ id: inviteId, method: 'POST' })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        })
        expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
      })

      test.prop([fc.uuid(), fc.openAuthorInvite()])("when the invite can't be saved", async (inviteId, invite) => {
        const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.left('unavailable'))

        const actual = await _.authorInviteDecline({ id: inviteId, method: 'POST' })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
        expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
      })
    })

    test.prop([fc.uuid(), fc.string().filter(method => method !== 'POST'), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, method, invite) => {
        const actual = await _.authorInviteDecline({ id: inviteId, method })({
          getAuthorInvite: () => TE.right(invite),
          getPrereview: shouldNotBeCalled,
          saveAuthorInvite: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
          status: Status.OK,
          title: expect.stringContaining('Invitation declined'),
          main: expect.stringContaining('Invitation declined'),
          skipToLabel: 'main',
          js: [],
          allowRobots: false,
        })
      },
    )
  })

  test.prop([
    fc.uuid(),
    fc.string().filter(method => method !== 'POST'),
    fc.openAuthorInvite(),
    fc.record({
      authors: fc.record({
        named: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        anonymous: fc.integer({ min: 0 }),
      }),
      doi: fc.doi(),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      license: fc.constant('CC-BY-4.0'),
      preprint: fc.record({
        id: fc.preprintId(),
        language: fc.languageCode(),
        title: fc.html(),
        url: fc.url(),
      }),
      published: fc.plainDate(),
      structured: fc.boolean(),
      text: fc.html(),
    }),
  ])('when the invite is open', async (inviteId, method, invite, review) => {
    const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(() => TE.right(review))

    const actual = await _.authorInviteDecline({ id: inviteId, method })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview,
      saveAuthorInvite: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
      status: Status.OK,
      title: expect.stringContaining('Decline the invitation'),
      main: expect.stringContaining('Decline the invitation'),
      skipToLabel: 'form',
      js: [],
      allowRobots: false,
    })
    expect(getPrereview).toHaveBeenCalledWith(invite.review)
  })

  test.prop([fc.uuid(), fc.string().filter(method => method !== 'POST'), fc.openAuthorInvite()])(
    "when the review can't be loaded",
    async (inviteId, method, invite) => {
      const actual = await _.authorInviteDecline({ id: inviteId, method })({
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
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.authorInvite().filter(invite => invite.status !== 'open' && invite.status !== 'declined'),
  ])('when the invite is not open or declined', async (inviteId, method, invite) => {
    const actual = await _.authorInviteDecline({ id: inviteId, method })({
      getAuthorInvite: () => TE.right(invite),
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

  test.prop([fc.uuid(), fc.string()])('when the invite is not found', async (inviteId, method) => {
    const actual = await _.authorInviteDecline({ id: inviteId, method })({
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
