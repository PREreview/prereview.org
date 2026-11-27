import { Effect, Layer, Option } from 'effect'
import * as _ from '../../../../src/Domain/Comments/GetDataForZenodoRecord/Enrich.ts'
import type { DataForZenodoRecordDetails } from '../../../../src/Domain/Comments/GetDataForZenodoRecord/Query.ts'
import {
  PreprintReviews,
  PrereviewIsNotFound,
  PrereviewIsUnavailable,
  PrereviewWasRemoved,
} from '../../../../src/Domain/PreprintReviews/index.ts'
import { Prereviewers, UnableToGetPersona } from '../../../../src/Domain/Prereviewers/index.ts'
import { html } from '../../../../src/html.ts'
import { PublicUrl } from '../../../../src/public-url.ts'
import { NonEmptyString, OrcidId } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'
import { expect, it, vi } from '../../../vitest.ts'

const details = {
  authorId: OrcidId.OrcidId('0000-0002-1825-0097'),
  persona: 'public',
  prereviewId: 12345,
  comment: html`<p>Some comment.</p>`,
  competingInterests: Option.some(NonEmptyString.NonEmptyString('Some competing interests')),
} satisfies DataForZenodoRecordDetails

it.effect.prop('enriches the details', [fc.publicPersona(), fc.prereview()], ([persona, prereview]) =>
  Effect.gen(function* () {
    const getPublicPersona = vi.fn<(typeof Prereviewers.Service)['getPublicPersona']>(() => Effect.succeed(persona))
    const getPreprintReview = vi.fn<(typeof PreprintReviews.Service)['getPreprintReview']>(() =>
      Effect.succeed(prereview),
    )

    const actual = yield* _.Enrich(details).pipe(
      Effect.provide([
        Layer.mock(Prereviewers, { getPublicPersona }),
        Layer.mock(PreprintReviews, { getPreprintReview }),
        Layer.succeed(PublicUrl, new URL('http://example.com')),
      ]),
    )

    expect(actual).toStrictEqual({
      author: persona,
      comment: details.comment,
      competingInterests: details.competingInterests,
      prereview: {
        doi: prereview.doi,
        url: new URL(`http://example.com/reviews/${prereview.id}`),
        preprint: { id: prereview.preprint.id, title: prereview.preprint.title },
      },
    })
    expect(getPublicPersona).toHaveBeenCalledWith(details.authorId)
    expect(getPreprintReview).toHaveBeenCalledWith(details.prereviewId)
  }),
)

it.effect.prop("when the persona can't be found", [fc.prereview()], ([prereview]) =>
  Effect.gen(function* () {
    const error = new UnableToGetPersona({})

    const actual = yield* Effect.flip(_.Enrich(details)).pipe(
      Effect.provide([
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.fail(error) }),
        Layer.mock(PreprintReviews, { getPreprintReview: () => Effect.succeed(prereview) }),
        Layer.succeed(PublicUrl, new URL('http://example.com')),
      ]),
    )

    expect(actual).toStrictEqual(error)
  }),
)

it.effect.prop(
  "when the PREreview can't be found",
  [
    fc.publicPersona(),
    fc.constantFrom(new PrereviewIsNotFound(), new PrereviewIsUnavailable({}), new PrereviewWasRemoved()),
  ],
  ([persona, error]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(_.Enrich(details)).pipe(
        Effect.provide([
          Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
          Layer.mock(PreprintReviews, { getPreprintReview: () => Effect.fail(error) }),
          Layer.succeed(PublicUrl, new URL('http://example.com')),
        ]),
      )

      expect(actual).toStrictEqual(error)
    }),
)
