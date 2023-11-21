import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { plainText } from '../../src/html'
import * as _ from '../../src/profile-page'
import { profileMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('profile', () => {
  describe('with an ORCID iD', () => {
    test.prop([
      fc.orcidProfileId(),
      fc.url(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
    ])(
      'when the data can be loaded',
      async (
        profile,
        avatar,
        name,
        prereviews,
        careerStage,
        researchInterests,
        location,
        languages,
        slackUser,
        openForRequests,
      ) => {
        const getAvatar = jest.fn<_.Env['getAvatar']>(_ => TE.of(avatar))
        const getName = jest.fn<_.Env['getName']>(_ => TE.of(name))
        const getPrereviews = jest.fn<_.Env['getPrereviews']>(_ => TE.of(prereviews))
        const getCareerStage = jest.fn<_.Env['getCareerStage']>(_ => TE.fromEither(careerStage))
        const getResearchInterests = jest.fn<_.Env['getResearchInterests']>(_ => TE.fromEither(researchInterests))
        const getLocation = jest.fn<_.Env['getLocation']>(_ => TE.fromEither(location))
        const getLanguages = jest.fn<_.Env['getLanguages']>(_ => TE.fromEither(languages))
        const getSlackUser = jest.fn<_.Env['getSlackUser']>(_ => TE.fromEither(slackUser))
        const isOpenForRequests = jest.fn<_.Env['isOpenForRequests']>(_ => TE.fromEither(openForRequests))

        const actual = await _.profile(profile)({
          getAvatar,
          getCareerStage,
          getLanguages,
          getLocation,
          getName,
          getPrereviews,
          getResearchInterests,
          getSlackUser,
          isOpenForRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(profileMatch.formatter, { profile }),
          status: Status.OK,
          title: expect.stringContaining(name ? plainText(name).toString() : profile.value),
          main: expect.stringContaining(profile.value),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAvatar).toHaveBeenCalledWith(profile.value)
        expect(getCareerStage).toHaveBeenCalledWith(profile.value)
        expect(getLanguages).toHaveBeenCalledWith(profile.value)
        expect(getLocation).toHaveBeenCalledWith(profile.value)
        expect(getName).toHaveBeenCalledWith(profile.value)
        expect(getPrereviews).toHaveBeenCalledWith(profile)
        expect(getResearchInterests).toHaveBeenCalledWith(profile.value)
        expect(getSlackUser).toHaveBeenCalledWith(profile.value)
        expect(isOpenForRequests).toHaveBeenCalledWith(profile.value)
      },
    )

    test.prop([
      fc.orcidProfileId(),
      fc.url(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])("when the name can't be found", async (profile, avatar, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.of(avatar),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.left('not-found'),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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

    test.prop([
      fc.orcidProfileId(),
      fc.url(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the name is unavailable', async (profile, avatar, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.of(avatar),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.left('unavailable'),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])("when the avatar can't be found", async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(profileMatch.formatter, { profile }),
        status: Status.OK,
        title: expect.stringContaining(name ? plainText(name).toString() : profile.value),
        main: expect.stringContaining(profile.value),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the avatar is unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('unavailable'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the career stage is unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('unavailable'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the research interests are unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('unavailable'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the location is unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('unavailable'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when languages are unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('unavailable'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the Slack user is unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('unavailable'),
        isOpenForRequests: () => TE.left('not-found'),
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
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when being open for requests is unavailable', async (profile, name, prereviews) => {
      const actual = await _.profile(profile)({
        getAvatar: () => TE.left('not-found'),
        getCareerStage: () => TE.left('not-found'),
        getLanguages: () => TE.left('not-found'),
        getLocation: () => TE.left('not-found'),
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getResearchInterests: () => TE.left('not-found'),
        getSlackUser: () => TE.left('not-found'),
        isOpenForRequests: () => TE.left('unavailable'),
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
  })

  describe('with a pseudonym', () => {
    test.prop([
      fc.pseudonymProfileId(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the data can be loaded', async (profile, prereviews) => {
      const getPrereviews = jest.fn<_.Env['getPrereviews']>(_ => TE.of(prereviews))

      const actual = await _.profile(profile)({
        getAvatar: shouldNotBeCalled,
        getCareerStage: shouldNotBeCalled,
        getLanguages: () => TE.left('not-found'),
        getLocation: shouldNotBeCalled,
        getName: shouldNotBeCalled,
        getPrereviews,
        getResearchInterests: shouldNotBeCalled,
        getSlackUser: shouldNotBeCalled,
        isOpenForRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(profileMatch.formatter, { profile }),
        status: Status.OK,
        title: expect.stringContaining(profile.value),
        main: expect.stringContaining(profile.value),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPrereviews).toHaveBeenCalledWith(profile)
    })
  })
})

test.prop([fc.profileId(), fc.url(), fc.option(fc.nonEmptyString(), { nil: undefined })])(
  "when the PREreviews can't be loaded",
  async (profile, avatar, name) => {
    const actual = await _.profile(profile)({
      getAvatar: () => TE.of(avatar),
      getCareerStage: () => TE.left('not-found'),
      getLanguages: () => TE.left('not-found'),
      getLocation: () => TE.left('not-found'),
      getName: () => TE.of(name),
      getPrereviews: () => TE.left('unavailable'),
      getResearchInterests: () => TE.left('not-found'),
      getSlackUser: () => TE.left('not-found'),
      isOpenForRequests: () => TE.left('not-found'),
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
