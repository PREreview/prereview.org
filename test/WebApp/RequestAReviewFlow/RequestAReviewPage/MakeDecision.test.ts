import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Array, Effect, Either, Layer, Option, Tuple } from 'effect'
import * as Preprints from '../../../../src/Preprints/index.ts'
import {
  BiorxivOrMedrxivPreprintId,
  BiorxivPreprintId,
  fromPreprintDoi,
  type IndeterminatePreprintId,
  MedrxivPreprintId,
  NotAPreprint,
  OsfOrLifecycleJournalPreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
  PreprintIsNotFound,
  PreprintIsUnavailable,
} from '../../../../src/Preprints/index.ts'
import * as _ from '../../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/MakeDecision.ts'
import * as RequestAReviewForm from '../../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/RequestAReviewForm.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'

describe('makeDecision', () => {
  describe('when the form has been submitted', () => {
    test.prop(
      [
        fc.oneof(
          fc
            .preprintDoi()
            .map(doi =>
              Tuple.make<[string, Array.NonEmptyReadonlyArray<IndeterminatePreprintId>]>(
                doi.toString(),
                Array.of(fromPreprintDoi(doi)),
              ),
            ),
          fc.supportedPreprintUrl().map(([url, id]) => Tuple.make(url.href, id)),
        ),
        fc.preprintId(),
      ],
      {
        examples: [
          [
            [
              'https://doi.org/10.1101/2021.06.18.21258689', // doi.org URL
              [new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new MedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              ' https://doi.org/10.1101/2021.06.18.21258689 ', // doi.org URL with whitespace
              [new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new MedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689', // biorxiv.org URL
              [new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              ' http://www.biorxiv.org/content/10.1101/2021.06.18.21258689 ', // biorxiv.org URL with whitespace
              [new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              'https://osf.io/eq8bk/', // ambigious URL
              [
                new OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
                new OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
              ],
            ],
            new OsfPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
          ],
        ],
      },
    )('when the form is valid', ([value, expected], preprintId) =>
      Effect.gen(function* () {
        const resolvePreprintId = jest.fn<(typeof Preprints.Preprints.Service)['resolvePreprintId']>(_ =>
          Effect.succeed(preprintId),
        )

        const actual = yield* Effect.provide(
          _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' }),
          Layer.mock(Preprints.Preprints, { resolvePreprintId }),
        )

        expect(actual).toStrictEqual({ _tag: 'BeginFlow', preprint: preprintId })
        expect(resolvePreprintId).toHaveBeenCalledWith(...expected)
      }).pipe(EffectTest.run),
    )

    test.prop([
      fc.oneof(
        fc.indeterminatePreprintIdWithDoi().map(id => Tuple.make(id.value, Array.of(id))),
        fc.supportedPreprintUrl().map(([url, id]) => Tuple.make(url.href, id)),
      ),
    ])('when the preprint is not found', ([value, preprint]) =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({
          _tag: 'ShowUnknownPreprint',
          preprint: expect.objectContaining({ value: preprint[0].value }),
        })
      }).pipe(
        Effect.provide(Layer.mock(Preprints.Preprints, { resolvePreprintId: () => new PreprintIsNotFound({}) })),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.oneof(
        fc.indeterminatePreprintIdWithDoi().map(id => id.value),
        fc.supportedPreprintUrl().map(([url]) => url.href),
      ),
    ])('when it is not a preprint', value =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({ _tag: 'ShowNotAPreprint' })
      }).pipe(
        Effect.provide(Layer.mock(Preprints.Preprints, { resolvePreprintId: () => new NotAPreprint({}) })),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.oneof(
        fc.preprintDoi(),
        fc.supportedPreprintUrl().map(([url]) => url.href),
      ),
    ])("when the preprint can't be loaded", value =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({ _tag: 'ShowError' })
      }).pipe(
        Effect.provide(Layer.mock(Preprints.Preprints, { resolvePreprintId: () => new PreprintIsUnavailable({}) })),
        EffectTest.run,
      ),
    )

    test.prop([fc.nonPreprintDoi()])('when it is not a supported DOI', value =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedDoi' })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {})), EffectTest.run),
    )

    test.prop([fc.nonPreprintUrl().map(url => url.href)])('when it is not a supported URL', value =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedUrl' })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {})), EffectTest.run),
    )

    test.prop([fc.nonEmptyString().filter(string => !string.startsWith('10.') && !URL.canParse(string))])(
      'when the form is invalid',
      whichPreprint =>
        Effect.gen(function* () {
          const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint }), method: 'POST' })

          expect(actual).toStrictEqual({
            _tag: 'ShowFormWithErrors',
            form: new RequestAReviewForm.InvalidForm({
              whichPreprint: Either.left(new RequestAReviewForm.Invalid({ value: whichPreprint })),
            }),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {})), EffectTest.run),
    )

    test.prop([
      fc.oneof(
        fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'whichPreprint'))),
        fc.urlParams(fc.record({ whichPreprint: fc.string({ unit: fc.whiteSpaceCharacter() }) })),
      ),
    ])('when the form is empty', body =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body, method: 'POST' })

        expect(actual).toStrictEqual({
          _tag: 'ShowFormWithErrors',
          form: new RequestAReviewForm.InvalidForm({
            whichPreprint: Either.left(new RequestAReviewForm.Missing()),
          }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {})), EffectTest.run),
    )
  })

  test.prop([fc.urlParams(), fc.string().filter(method => method !== 'POST')])(
    'when the form needs submitting',
    (body, method) =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body, method })

        expect(actual).toStrictEqual({ _tag: 'ShowEmptyForm' })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {})), EffectTest.run),
  )
})
