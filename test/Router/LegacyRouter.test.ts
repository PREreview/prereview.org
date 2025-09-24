import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as FeatureFlags from '../../src/FeatureFlags.ts'
import { rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import * as OrcidOauth from '../../src/OrcidOauth.ts'
import { PublicUrl } from '../../src/public-url.ts'
import * as _ from '../../src/Router/LegacyRouter.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { TemplatePage } from '../../src/TemplatePage.ts'
import * as EffectTest from '../EffectTest.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('LegacyRouter', () => {
  test.each([
    ['/10.1101/2020.08.27.270835', '/preprints/doi-10.1101-2020.08.27.270835'],
    ['/10.5281/zenodo.3733767', '/preprints/doi-10.5281-zenodo.3733767'],
    ['/blog', 'https://content.prereview.org/'],
    ['/blog?articles_format=grid', 'https://content.prereview.org/'],
    ['/coc', '/code-of-conduct'],
    ['/communities', '/clubs'],
    ['/communities?page=1', '/clubs'],
    ['/communities?search=&page=2&limit=10&offset=0', '/clubs'],
    ['/docs/about', '/about'],
    ['/docs/codeofconduct', '/code-of-conduct'],
    ['/docs/code_of_conduct', '/code-of-conduct'],
    ['/docs/resources', '/resources'],
    ['/edi-statement', '/edia-statement'],
    ['/edia', '/edia-statement'],
    ['/find-a-preprint', '/review-a-preprint'],
    ['/login', '/log-in'],
    ['/login?next=/10.1101/2020.03.24.004655', '/log-in'],
    ['/logout', '/log-out'],
    ['/preprint-journal-clubs', '/live-reviews'],
    ['/prereview.org', '/'],
    ['/PREreview.org', '/'],
    ['/reviews/new', '/review-a-preprint'],
    ['/signup', '/log-in'],
    ['/)', '/'],
    ['/),', '/'],
  ])('redirects %s', (path, expected) =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(new Request(`http://localhost/${path}`))

      const response = yield* Effect.provideService(_.LegacyRouter, HttpServerRequest.HttpServerRequest, request)

      expect(response).toStrictEqual(HttpServerResponse.redirect(expected, { status: StatusCodes.MovedPermanently }))
    }).pipe(
      Effect.provideService(TemplatePage, shouldNotBeCalled),
      Effect.provideService(Locale, DefaultLocale),
      Effect.provide(
        OrcidOauth.layer({ url: new URL('http://orcid.test'), clientId: 'id', clientSecret: Redacted.make('secret') }),
      ),
      Effect.provideService(PublicUrl, new URL('http://example.com')),
      Effect.provide(featureFlagsLayer),
      EffectTest.run,
    ),
  )

  test.each([
    ['/admin'],
    ['/api'],
    ['/api/docs'],
    ['/api/openapi.json'],
    ['/communities/africarxiv'],
    ['/communities/africarxiv?page=2'],
    ['/communities/africarxiv?page=2&limit=10&offset=0&search='],
    ['/communities/africarxiv/new'],
    ['/communities/eLifeAmbassadors'],
    ['/communities/eLifeAmbassadors?page=2'],
    ['/communities/eLifeAmbassadors?page=2&limit=10&offset=0&search='],
    ['/communities/eLifeAmbassadors/new'],
    ['/community-settings/6abac91b-1bd6-4178-8c72-38695c2e9680'],
    ['/community-settings/c36edcca-ba95-475d-a851-ad0f277ac99d'],
    ['/events/434b46a1-0c52-4a09-9802-bddc16873b88'],
    ['/prereviewers'],
    ['/prereviewers?page=1'],
    [
      '/prereviewers?badges=Reviewer+Trainee%2CPREreview+V1&sort=dateJoined&page=2&limit=10&offset=10&communities=Photosynthesis',
    ],
    ['/settings/api'],
    ['/settings/drafts'],
  ])('removed page for %s', path =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(new Request(`http://localhost${path}`))

      const response = yield* Effect.provideService(_.LegacyRouter, HttpServerRequest.HttpServerRequest, request)

      expect(response.status).toStrictEqual(StatusCodes.NotFound)
    }).pipe(
      Effect.provideService(TemplatePage, () => rawHtml('page-content')),
      Effect.provideService(Locale, DefaultLocale),
      Effect.provide(
        OrcidOauth.layer({
          url: new URL('http://orcid.test'),
          clientId: 'id',
          clientSecret: Redacted.make('secret'),
        }),
      ),
      Effect.provideService(PublicUrl, new URL('http://example.com')),
      Effect.provide(featureFlagsLayer),
      EffectTest.run,
    ),
  )

  test.each([
    ['/dashboard'],
    ['/dashboard?page=2'],
    ['/dashboard?search=covid-19&page=2&limit=10&offset=0'],
    ['/dashboard/new'],
    ['/dashboard/new?page=2'],
    ['/dashboard/new?search=covid-19&page=2&limit=10&offset=0'],
    ['/extension'],
  ])('removed page for %s', path =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(new Request(`http://localhost${path}`))

      const response = yield* Effect.provideService(_.LegacyRouter, HttpServerRequest.HttpServerRequest, request)

      expect(response.status).toStrictEqual(StatusCodes.Gone)
    }).pipe(
      Effect.provideService(TemplatePage, () => rawHtml('page-content')),
      Effect.provideService(Locale, DefaultLocale),
      Effect.provide(
        OrcidOauth.layer({
          url: new URL('http://orcid.test'),
          clientId: 'id',
          clientSecret: Redacted.make('secret'),
        }),
      ),
      Effect.provideService(PublicUrl, new URL('http://example.com')),
      Effect.provide(featureFlagsLayer),
      EffectTest.run,
    ),
  )
})

const featureFlagsLayer = FeatureFlags.layer({
  aiReviewsAsCc0: shouldNotBeCalled,
  askAiReviewEarly: shouldNotBeCalled,
  canAddMultipleAuthors: shouldNotBeCalled,
  canLogInAsDemoUser: false,
  canReviewDatasets: false,
  useCrowdinInContext: false,
})
