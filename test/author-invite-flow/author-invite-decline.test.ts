import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/decline-page/index.js'
import * as _ from '../../src/author-invite-flow/index.js'
import type { SaveAuthorInviteEnv } from '../../src/author-invite.js'
import { authorInviteDeclineMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

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
          status: Status.SeeOther,
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
            status: Status.SeeOther,
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
            status: Status.ServiceUnavailable,
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
        status: Status.OK,
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
      status: Status.OK,
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
        status: Status.ServiceUnavailable,
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
      status: Status.NotFound,
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
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
