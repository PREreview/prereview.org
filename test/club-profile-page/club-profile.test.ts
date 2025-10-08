import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer, pipe } from 'effect'
import { encode } from 'html-entities'
import { getClubName } from '../../src/Clubs/index.ts'
import { Locale } from '../../src/Context.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/club-profile-page/index.ts'
import * as Routes from '../../src/routes.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('clubProfile', () => {
  test.prop([
    fc.clubId(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
        published: fc.plainDate(),
        fields: fc.array(fc.fieldId()),
        subfields: fc.array(fc.subfieldId()),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.supportedLocale(),
  ])('when the data can be loaded', (clubId, prereviews, locale) =>
    Effect.gen(function* () {
      const getForClub = jest.fn<(typeof Prereviews.Prereviews.Service)['getForClub']>(_ => Effect.succeed(prereviews))

      const actual = yield* pipe(
        _.clubProfile({ id: clubId }),
        Effect.provide(Layer.mock(Prereviews.Prereviews, { getForClub })),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ClubProfile.href({ id: clubId }),
        status: StatusCodes.OK,
        title: expect.plainTextContaining(getClubName(clubId)),
        main: expect.htmlContaining(encode(getClubName(clubId))),
        skipToLabel: 'main',
        js: [],
      })
      expect(getForClub).toHaveBeenCalledWith(clubId)
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([fc.clubId(), fc.supportedLocale()])('when the PREreviews are unavailable', (clubId, locale) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.clubProfile({ id: clubId }),
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
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )
})
