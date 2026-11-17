import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Option } from 'effect'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/ExternalInteractions/PreprintData/OpenAlex/DeterminePreprintId.ts'
import * as fc from '../../../fc.ts'

const workWithSource = (source: fc.Arbitrary<Option.Option<{ display_name: string }>>) =>
  fc.tuple(fc.openAlexWork(), fc.maybe(fc.url()), source).map(([work, landing_page_url, source]) => ({
    ...work,
    primary_location: Option.some({ landing_page_url, source }),
  }))

const sourceNamed = (displayName: fc.Arbitrary<string>) =>
  displayName.map(display_name => Option.some({ display_name }))

describe('determinePreprintId', () => {
  describe('when it might be bioRxiv or medRxiv', () => {
    it.effect.prop(
      'from bioRxiv',
      [
        fc.biorxivOrMedrxivPreprintId(),
        workWithSource(
          sourceNamed(
            fc.oneof(
              fc.constant('bioRxiv (Cold Spring Harbor Laboratory)'),
              fc.string().map(suffix => `bioRxiv${suffix}`),
            ),
          ),
        ),
      ],
      ([id, work]) =>
        Effect.gen(function* () {
          const actual = yield* _.determinePreprintId(id, work)

          expect(actual).toStrictEqual(new Preprints.BiorxivPreprintId({ value: id.value }))
        }),
    )

    it.effect.prop(
      'from medRxiv',
      [
        fc.biorxivOrMedrxivPreprintId(),
        workWithSource(
          sourceNamed(
            fc.oneof(
              fc.constant('medRxiv (Cold Spring Harbor Laboratory)'),
              fc.string().map(suffix => `medRxiv${suffix}`),
            ),
          ),
        ),
      ],
      ([id, work]) =>
        Effect.gen(function* () {
          const actual = yield* _.determinePreprintId(id, work)

          expect(actual).toStrictEqual(new Preprints.MedrxivPreprintId({ value: id.value }))
        }),
    )

    it.effect.prop(
      'from somewhere else',
      [
        fc.biorxivOrMedrxivPreprintId(),
        workWithSource(
          fc.oneof(
            fc.constant(Option.none()),
            sourceNamed(
              fc.oneof(
                fc.constant('Nature Communications'),
                fc.string().filter(name => !name.startsWith('bioRxiv') && !name.startsWith('medRxiv')),
              ),
            ),
          ),
        ),
      ],
      ([id, work]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.determinePreprintId(id, work))

          expect(actual).toBeInstanceOf(Preprints.PreprintIsUnavailable)
        }),
    )

    it.effect.prop(
      'without a primary location',
      [fc.biorxivOrMedrxivPreprintId(), fc.openAlexWork().map(work => ({ ...work, primary_location: Option.none() }))],
      ([id, work]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.determinePreprintId(id, work))

          expect(actual).toBeInstanceOf(Preprints.PreprintIsUnavailable)
        }),
    )
  })

  it.effect.prop(
    'when it might be OSF or Lifecycle Journal',
    [fc.osfOrLifecycleJournalPreprintId(), fc.openAlexWork()],
    ([id, work]) =>
      Effect.gen(function* () {
        const actual = yield* _.determinePreprintId(id, work)

        expect(actual).toStrictEqual(new Preprints.OsfPreprintId({ value: id.value }))
      }),
  )

  it.effect.prop(
    'when it might be Zenodo or AfricArXiv',
    [fc.zenodoOrAfricarxivPreprintId(), fc.openAlexWork()],
    ([id, work]) =>
      Effect.gen(function* () {
        const actual = yield* _.determinePreprintId(id, work)

        expect(actual).toStrictEqual(new Preprints.ZenodoPreprintId({ value: id.value }))
      }),
  )

  it.effect.prop('when it is already determined', [fc.preprintIdWithDoi(), fc.openAlexWork()], ([id, work]) =>
    Effect.gen(function* () {
      const actual = yield* _.determinePreprintId(id, work)

      expect(actual).toStrictEqual(id)
    }),
  )
})
