import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, pipe } from 'effect'
import { encode } from 'html-entities'
import { getClubName, getClubSlug } from '../../src/Clubs/index.ts'
import { Locale } from '../../src/Context.ts'
import { OrcidRecords } from '../../src/ExternalInteractions/index.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/ClubProfilePage/index.ts'
import * as fc from '../fc.ts'

describe('ClubProfilePage', () => {
  it.effect.prop(
    'when the data can be loaded',
    [
      fc.clubId(),
      fc.array(
        fc
          .record({
            id: fc.integer(),
            reviewers: fc.record({ named: fc.nonEmptyArray(fc.name()), anonymous: fc.integer({ min: 0 }) }),
            published: fc.plainDate(),
            fields: fc.array(fc.fieldId()),
            subfields: fc.array(fc.subfieldId()),
            preprint: fc.preprintTitle(),
          })
          .map(args => new Prereviews.RecentPreprintPrereview(args)),
      ),
      fc.supportedLocale(),
      fc.name(),
    ],
    ([clubId, prereviews, locale, name]) =>
      Effect.gen(function* () {
        const getForClub = vi.fn<(typeof Prereviews.Prereviews.Service)['getForClub']>(_ => Effect.succeed(prereviews))

        const actual = yield* pipe(
          _.ClubProfilePage({ slug: getClubSlug(clubId) }),
          Effect.provide(Layer.mock(Prereviews.Prereviews, { getForClub })),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.ClubProfile.href({ slug: getClubSlug(clubId) }),
          status: StatusCodes.OK,
          title: expect.plainTextContaining(getClubName(clubId).text),
          main: expect.htmlContaining(encode(getClubName(clubId).text)),
          skipToLabel: 'main',
          js: [],
        })
        expect(getForClub).toHaveBeenCalledWith(clubId)
      }).pipe(
        Effect.provide(Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) })),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop(
    'when the PREreviews are unavailable',
    [fc.clubId(), fc.supportedLocale(), fc.name()],
    ([clubId, locale, name]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.ClubProfilePage({ slug: getClubSlug(clubId) }),
          Effect.provide(
            Layer.mock(Prereviews.Prereviews, { getForClub: () => new Prereviews.PrereviewsAreUnavailable() }),
          ),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) })),
        Effect.provideService(Locale, locale),
      ),
  )
})
