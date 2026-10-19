import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { type Doi, DoiC } from '../../types/Doi.ts'
import { addToSession, popFromSession } from '../session.ts'

export type PublishedReview = C.TypeOf<typeof PublishedReviewC>

export const PublishedReviewC = C.struct({
  doi: DoiC,
  moreAuthors: C.literal('yes', 'no', 'yes-private'),
  otherAuthors: C.number,
  persona: C.literal('public', 'pseudonym'),
  id: C.number,
})

export const storeInformationForWriteReviewPublishedPage = (
  doi: Doi,
  moreAuthors: 'yes' | 'no' | 'yes-private',
  otherAuthors: number,
  persona: 'public' | 'pseudonym',
  id: number,
) => addToSession('published-review', PublishedReviewC.encode({ doi, moreAuthors, otherAuthors, persona, id }))

export const popPublishedReview = pipe(
  popFromSession('published-review'),
  RTE.chainEitherKW(PublishedReviewC.decode),
  RTE.mapLeft(() => 'no-published-review' as const),
)
