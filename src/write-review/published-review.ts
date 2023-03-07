import { Doi, isDoi } from 'doi-ts'
import { Json, JsonRecord } from 'fp-ts/Json'
import * as O from 'fp-ts/Option'
import * as RR from 'fp-ts/ReadonlyRecord'
import { flow, pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { CompletedForm, CompletedFormC } from './completed-form'

export type PublishedReview = C.TypeOf<typeof PublishedReviewC>

const DoiC = C.make(pipe(D.string, D.refine(isDoi, 'DOI')), { encode: String })

export const PublishedReviewC: C.Codec<unknown, JsonRecord, { doi: Doi; form: CompletedForm }> = C.struct({
  doi: DoiC,
  form: CompletedFormC,
})

export const storePublishedReviewInSession = (publishedReview: PublishedReview, session: JsonRecord): JsonRecord =>
  pipe(session, RR.upsertAt('published-review', PublishedReviewC.encode(publishedReview) as Json))

export const getPublishedReviewFromSession: (session: JsonRecord) => O.Option<PublishedReview> = flow(
  RR.lookup('published-review'),
  O.chainEitherK(PublishedReviewC.decode),
)
