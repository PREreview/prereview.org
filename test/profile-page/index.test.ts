import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Prereviews from '../../src/Prereviews/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { plainText } from '../../src/html.ts'
import * as _ from '../../src/profile-page/index.ts'
import { profileMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('profile', () => {
  describe('with an ORCID iD', () => {
    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.url(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
    ])(
      'when the data can be loaded',
      async (
        locale,
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

        const actual = await _.profile({ locale, profile })({
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
          status: StatusCodes.OK,
          title: expect.plainTextContaining(name ? plainText(name).toString() : profile.orcid),
          main: expect.htmlContaining(profile.orcid),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAvatar).toHaveBeenCalledWith(profile.orcid)
        expect(getCareerStage).toHaveBeenCalledWith(profile.orcid)
        expect(getLanguages).toHaveBeenCalledWith(profile.orcid)
        expect(getLocation).toHaveBeenCalledWith(profile.orcid)
        expect(getName).toHaveBeenCalledWith(profile.orcid)
        expect(getPrereviews).toHaveBeenCalledWith(profile)
        expect(getResearchInterests).toHaveBeenCalledWith(profile.orcid)
        expect(getSlackUser).toHaveBeenCalledWith(profile.orcid)
        expect(isOpenForRequests).toHaveBeenCalledWith(profile.orcid)
      },
    )

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.url(),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])("when the name can't be found", async (locale, profile, avatar, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.url(),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the name is unavailable', async (locale, profile, avatar, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])("when the avatar can't be found", async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.OK,
        title: expect.plainTextContaining(name ? plainText(name).toString() : profile.orcid),
        main: expect.htmlContaining(profile.orcid),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the avatar is unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the career stage is unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the research interests are unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the location is unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when languages are unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the Slack user is unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.supportedLocale(),
      fc.orcidProfileId(),
      fc.option(fc.nonEmptyString(), { nil: undefined }),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when being open for requests is unavailable', async (locale, profile, name, prereviews) => {
      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  describe('with a pseudonym', () => {
    test.prop([
      fc.supportedLocale(),
      fc.pseudonymProfileId(),
      fc.array(
        fc.oneof(
          fc
            .record({
              id: fc.integer(),
              reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
              published: fc.plainDate(),
              fields: fc.array(fc.fieldId()),
              subfields: fc.array(fc.subfieldId()),
              preprint: fc.preprintTitle(),
            })
            .map(args => new Prereviews.RecentPreprintPrereview(args)),
          fc
            .record({
              id: fc.uuid(),
              doi: fc.doi(),
              author: fc.persona(),
              published: fc.plainDate(),
              dataset: fc.datasetTitle(),
            })
            .map(args => new Prereviews.RecentDatasetPrereview(args)),
        ),
      ),
    ])('when the data can be loaded', async (locale, profile, prereviews) => {
      const getPrereviews = jest.fn<_.Env['getPrereviews']>(_ => TE.of(prereviews))

      const actual = await _.profile({ locale, profile })({
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
        status: StatusCodes.OK,
        title: expect.plainTextContaining(profile.pseudonym),
        main: expect.htmlContaining(profile.pseudonym),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPrereviews).toHaveBeenCalledWith(profile)
    })
  })
})

test.prop([fc.supportedLocale(), fc.profileId(), fc.url(), fc.option(fc.nonEmptyString(), { nil: undefined })])(
  "when the PREreviews can't be loaded",
  async (locale, profile, avatar, name) => {
    const actual = await _.profile({ locale, profile })({
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
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  },
)
