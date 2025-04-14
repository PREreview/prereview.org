import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetPrereviewEnv } from '../../src/author-invite-flow/author-invite.js'
import * as _ from '../../src/author-invite-flow/index.js'
import type { GetAuthorInviteEnv } from '../../src/author-invite.js'
import {
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
} from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('authorInvite', () => {
  test.prop([
    fc.uuid(),
    fc.constant(undefined),
    fc.supportedLocale(),
    fc.authorInvite().filter(invite => invite.status !== 'declined'),
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
  ])('when the user is not logged in', async (inviteId, user, locale, invite, prereview) => {
    const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
    const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

    const actual = await _.authorInvite({ id: inviteId, locale, user })({
      getAuthorInvite,
      getPrereview,
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(authorInviteMatch.formatter, { id: inviteId }),
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
      allowRobots: false,
    })
    expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
    expect(getPrereview).toHaveBeenCalledWith(invite.review)
  })

  describe('when the user is logged in', () => {
    test.prop([
      fc.uuid(),
      fc.user(),
      fc.supportedLocale(),
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
    ])('when the invite is open', async (inviteId, user, locale, invite, prereview) => {
      const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
      const getPrereview = jest.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

      const actual = await _.authorInvite({ id: inviteId, locale, user })({
        getAuthorInvite,
        getPrereview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInviteMatch.formatter, { id: inviteId }),
        status: Status.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
        allowRobots: false,
      })
      expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
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
    ])('when the invite is assigned', async (inviteId, [user, invite], locale, prereview) => {
      const actual = await _.authorInvite({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.right(prereview),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInviteStartMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
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
    ])('when the invite is completed', async (inviteId, [user, invite], locale, prereview) => {
      const actual = await _.authorInvite({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: () => TE.right(prereview),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
      })
    })
  })

  test.prop([
    fc.uuid(),
    fc.oneof(
      fc.tuple(
        fc.constant(undefined),
        fc.authorInvite().filter(invite => invite.status !== 'declined'),
      ),
      fc
        .user()
        .chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.oneof(
              fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }),
              fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }),
            ),
          ),
        ),
    ),
    fc.supportedLocale(),
  ])('when the review cannot be loaded', async (inviteId, [user, invite], locale) => {
    const actual = await _.authorInvite({ id: inviteId, locale, user })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview: () => TE.left('unavailable'),
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

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
    'when the invite cannot be loaded',
    async (inviteId, user, locale) => {
      const actual = await _.authorInvite({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.left('unavailable'),
        getPrereview: shouldNotBeCalled,
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
    fc
      .tuple(fc.user(), fc.oneof(fc.assignedAuthorInvite(), fc.completedAuthorInvite()))
      .filter(([user, invite]) => !eqOrcid.equals(user.orcid, invite.orcid)),
    fc.supportedLocale(),
  ])('when the invite is assigned to someone else', async (inviteId, [user, invite], locale) => {
    const actual = await _.authorInvite({ id: inviteId, locale, user })({
      getAuthorInvite: () => TE.right(invite),
      getPrereview: shouldNotBeCalled,
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

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale(), fc.declinedAuthorInvite()])(
    'when the invite has been declined',
    async (inviteId, user, locale, invite) => {
      const actual = await _.authorInvite({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
      })
    },
  )

  test.prop([fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
    'when the invite is not found',
    async (inviteId, user, locale) => {
      const actual = await _.authorInvite({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.left('not-found'),
        getPrereview: shouldNotBeCalled,
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
