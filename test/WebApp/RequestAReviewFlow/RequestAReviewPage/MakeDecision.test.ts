import { UrlParams } from '@effect/platform'
import { describe, expect, it, vi } from '@effect/vitest'
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
import * as fc from '../../../fc.ts'

describe('makeDecision', () => {
  describe('when the form has been submitted', () => {
    it.effect.prop(
      'when the form is valid',
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
      ([[value, expected], preprintId]) =>
        Effect.gen(function* () {
          const resolvePreprintId = vi.fn<(typeof Preprints.Preprints.Service)['resolvePreprintId']>(_ =>
            Effect.succeed(preprintId),
          )

          const actual = yield* Effect.provide(
            _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' }),
            Layer.mock(Preprints.Preprints, { resolvePreprintId }),
          )

          expect(actual).toStrictEqual({ _tag: 'BeginFlow', preprint: preprintId })
          expect(resolvePreprintId).toHaveBeenCalledWith(...expected)
        }),
      {
        fastCheck: {
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
      },
    )

    it.effect.prop(
      'when the preprint is not found',
      [
        fc.oneof(
          fc.indeterminatePreprintIdWithDoi().map(id => Tuple.make(id.value, Array.of(id))),
          fc.supportedPreprintUrl().map(([url, id]) => Tuple.make(url.href, id)),
        ),
      ],
      ([[value, preprint]]) =>
        Effect.gen(function* () {
          const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

          expect(actual).toStrictEqual({
            _tag: 'ShowUnknownPreprint',
            preprint: expect.objectContaining({ value: preprint[0].value }),
          })
        }).pipe(
          Effect.provide(Layer.mock(Preprints.Preprints, { resolvePreprintId: () => new PreprintIsNotFound({}) })),
        ),
    )

    it.effect.prop(
      'when it is not a preprint',
      [
        fc.oneof(
          fc.indeterminatePreprintIdWithDoi().map(id => id.value),
          fc.supportedPreprintUrl().map(([url]) => url.href),
        ),
      ],
      value =>
        Effect.gen(function* () {
          const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

          expect(actual).toStrictEqual({ _tag: 'ShowNotAPreprint' })
        }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, { resolvePreprintId: () => new NotAPreprint({}) }))),
    )

    it.effect.prop(
      "when the preprint can't be loaded",
      [
        fc.oneof(
          fc.preprintDoi(),
          fc.supportedPreprintUrl().map(([url]) => url.href),
        ),
      ],
      value =>
        Effect.gen(function* () {
          const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

          expect(actual).toStrictEqual({ _tag: 'ShowError' })
        }).pipe(
          Effect.provide(Layer.mock(Preprints.Preprints, { resolvePreprintId: () => new PreprintIsUnavailable({}) })),
        ),
    )

    it.effect.prop('when it is not a supported DOI', [fc.nonPreprintDoi()], ([value]) =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedDoi' })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {}))),
    )

    it.effect.prop('when it is not a supported URL', [fc.nonPreprintUrl().map(url => url.href)], ([value]) =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint: value }), method: 'POST' })

        expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedUrl' })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {}))),
    )

    it.effect.prop(
      'when the form is invalid',
      [fc.nonEmptyString().filter(string => !string.startsWith('10.') && !URL.canParse(string))],
      ([whichPreprint]) =>
        Effect.gen(function* () {
          const actual = yield* _.makeDecision({ body: UrlParams.fromInput({ whichPreprint }), method: 'POST' })

          expect(actual).toStrictEqual({
            _tag: 'ShowFormWithErrors',
            form: new RequestAReviewForm.InvalidForm({
              whichPreprint: Either.left(new RequestAReviewForm.Invalid({ value: whichPreprint })),
            }),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {}))),
    )

    it.effect.prop(
      'when the form is empty',
      [
        fc.oneof(
          fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'whichPreprint'))),
          fc.urlParams(fc.record({ whichPreprint: fc.string({ unit: fc.whiteSpaceCharacter() }) })),
        ),
      ],
      ([body]) =>
        Effect.gen(function* () {
          const actual = yield* _.makeDecision({ body, method: 'POST' })

          expect(actual).toStrictEqual({
            _tag: 'ShowFormWithErrors',
            form: new RequestAReviewForm.InvalidForm({
              whichPreprint: Either.left(new RequestAReviewForm.Missing()),
            }),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {}))),
    )
  })

  it.effect.prop(
    'when the form needs submitting',
    [fc.urlParams(), fc.string().filter(method => method !== 'POST')],
    ([body, method]) =>
      Effect.gen(function* () {
        const actual = yield* _.makeDecision({ body, method })

        expect(actual).toStrictEqual({ _tag: 'ShowEmptyForm' })
      }).pipe(Effect.provide(Layer.mock(Preprints.Preprints, {}))),
  )
})
