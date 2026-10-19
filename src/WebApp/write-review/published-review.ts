import { pipe } from 'effect'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { type CompletedForm, CompletedFormC, FormC } from '../../PreprintReviews/index.ts'
import { type Doi, DoiC } from '../../types/Doi.ts'
import { addToSession, popFromSession } from '../session.ts'

export type PublishedReview = C.TypeOf<typeof PublishedReviewC>

export const PublishedReviewC: C.Codec<unknown, JsonRecord, { doi: Doi; form: CompletedForm; id: number }> = C.struct({
  doi: DoiC,
  form: pipe(FormC, C.compose(CompletedFormC)),
  id: C.number,
})

export const storeInformationForWriteReviewPublishedPage = (doi: Doi, id: number, form: CompletedForm) =>
  addToSession('published-review', PublishedReviewC.encode({ doi, id, form }))

export const popPublishedReview = pipe(
  popFromSession('published-review'),
  RTE.chainEitherKW(PublishedReviewC.decode),
  RTE.mapLeft(() => 'no-published-review' as const),
)
