import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, pipe } from 'effect'
import { encode } from 'html-entities'
import { Clubs } from '../../src/Clubs/index.ts'
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
      fc.slug(),
      fc.clubDetails(),
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
    ([slug, club, prereviews, locale, name]) =>
      Effect.gen(function* () {
        const getForClub = vi.fn<(typeof Prereviews.Prereviews.Service)['getForClub']>(_ => Effect.succeed(prereviews))

        const actual = yield* pipe(
          _.ClubProfilePage({ slug }),
          Effect.provide(Layer.mock(Prereviews.Prereviews, { getForClub })),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.ClubProfile.href({ slug: club.slug }),
          status: StatusCodes.OK,
          title: expect.plainTextContaining(club.name.text),
          main: expect.htmlContaining(encode(club.name.text)),
          skipToLabel: 'main',
          js: [],
        })
        expect(getForClub).toHaveBeenCalledWith(club.id)
      }).pipe(
        Effect.provide([
          Layer.mock(Clubs, { getClubBySlug: () => Effect.succeed(club) }),
          Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) }),
        ]),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop(
    'when the PREreviews are unavailable',
    [fc.slug(), fc.clubDetails(), fc.supportedLocale(), fc.name()],
    ([slug, club, locale, name]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.ClubProfilePage({ slug }),
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
        Effect.provide([
          Layer.mock(Clubs, { getClubBySlug: () => Effect.succeed(club) }),
          Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) }),
        ]),
        Effect.provideService(Locale, locale),
      ),
  )
})
