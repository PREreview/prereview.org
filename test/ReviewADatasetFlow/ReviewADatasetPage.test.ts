import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer, Option, pipe, Predicate, Tuple } from 'effect'
import { Locale } from '../../src/Context.js'
import * as Datasets from '../../src/Datasets/index.js'
import { DefaultLocale } from '../../src/locales/index.js'
import * as _ from '../../src/ReviewADatasetFlow/ReviewADatasetPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { Doi } from '../../src/types/index.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

test.prop([fc.supportedLocale(), fc.datasetId(), fc.dataset()])('ReviewADatasetPage', locale =>
  Effect.gen(function* () {
    const actual = yield* _.ReviewADatasetPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: Routes.ReviewADataset,
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  }).pipe(Effect.provide(Layer.mock(Datasets.Datasets, {})), Effect.provideService(Locale, locale), EffectTest.run),
)

describe('ReviewADatasetSubmission', () => {
  test.failing.prop(
    [
      fc.supportedLocale(),
      fc.datasetId().map(id => Tuple.make<[string, Datasets.DatasetId]>(id.value, id)),
      fc.datasetId(),
    ],
    {
      examples: [
        [
          DefaultLocale,
          [
            '10.5061/dryad.wstqjq2n3', // DOI
            new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
          ],
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
        [
          DefaultLocale,
          [
            ' 10.5061/dryad.wstqjq2n3 ', // DOI with whitespace
            new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
          ],
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
        [
          DefaultLocale,
          [
            'https://doi.org/10.5061/dryad.wstqjq2n3', // doi.org URL
            new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
          ],
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
        [
          DefaultLocale,
          [
            ' https://doi.org/10.5061/dryad.wstqjq2n3 ', // doi.org URL with whitespace
            new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
          ],
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
    },
  )('when there is a dataset DOI', (locale, [value, expected], resolved) =>
    Effect.gen(function* () {
      const resolveDatasetId = jest.fn<(typeof Datasets.Datasets.Service)['resolveDatasetId']>(_ =>
        Effect.succeed(resolved),
      )

      const actual = yield* pipe(
        _.ReviewADatasetSubmission({ body: UrlParams.fromInput({ whichDataset: value }) }),
        Effect.provide(Layer.mock(Datasets.Datasets, { resolveDatasetId })),
      )

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: Routes.ReviewThisDataset.href({ datasetId: resolved }),
      })
      expect(resolveDatasetId).toHaveBeenCalledWith(expected)
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.failing.prop([
    fc.supportedLocale(),
    fc.urlParams(fc.record({ whichDataset: fc.datasetDoi() })),
    fc.record({ cause: fc.anything(), datasetId: fc.datasetId() }).map(args => new Datasets.DatasetIsNotFound(args)),
  ])('when the dataset is not found', (locale, body, error) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewADatasetSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(Datasets.Datasets, { resolveDatasetId: () => error })),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.urlParams(fc.record({ whichDataset: fc.datasetDoi() })),
    fc.record({ cause: fc.anything(), datasetId: fc.datasetId() }).map(args => new Datasets.DatasetIsUnavailable(args)),
  ])('when the dataset is unavailable', (locale, body, error) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewADatasetSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(Datasets.Datasets, { resolveDatasetId: () => error })),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.failing.prop([
    fc.supportedLocale(),
    fc.urlParams(fc.record({ whichDataset: fc.nonDatasetDoi() })),
    fc.record({ cause: fc.anything(), datasetId: fc.datasetId() }).map(args => new Datasets.NotADataset(args)),
  ])("when the DOI isn't for a dataset", (locale, body, error) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewADatasetSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(Datasets.Datasets, { resolveDatasetId: () => error })),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.oneof(
      fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'whichDataset'))),
      fc.urlParams(fc.record({ whichDataset: fc.string().filter(Predicate.not(Doi.isDoi)) })),
    ),
  ])("when there isn't a dataset DOI", (locale, body) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewADatasetSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ReviewADataset,
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    }).pipe(Effect.provide(Layer.mock(Datasets.Datasets, {})), Effect.provideService(Locale, locale), EffectTest.run),
  )
})
