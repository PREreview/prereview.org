import { type Doi, isDoi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import * as RR from 'fp-ts/lib/ReadonlyRecord.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import type { HeadersOpen } from 'hyper-ts'
import { getSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { type CompletedForm, CompletedFormC } from './completed-form.js'
import { FormC } from './form.js'

export type PublishedReview = C.TypeOf<typeof PublishedReviewC>

const DoiC = C.make(pipe(D.string, D.refine(isDoi, 'DOI')), { encode: String })

export const PublishedReviewC: C.Codec<unknown, JsonRecord, { doi: Doi; form: CompletedForm; id: number }> = C.struct({
  doi: DoiC,
  form: pipe(FormC, C.compose(CompletedFormC)),
  id: C.number,
})

const getPublishedReviewFromSession: (session: JsonRecord) => E.Either<'no-published-review', PublishedReview> = flow(
  RR.lookup('published-review'),
  E.fromOption(() => 'no-published-review' as const),
  E.chainW(PublishedReviewC.decode),
  E.mapLeft(() => 'no-published-review' as const),
)

export const storeInformationForWriteReviewPublishedPage = (doi: Doi, id: number, form: CompletedForm) =>
  pipe(
    getSession<HeadersOpen>(),
    RM.map(RR.upsertAt('published-review', PublishedReviewC.encode({ doi, id, form }) as Json)),
    RM.chainW(storeSession),
  )

export const getPublishedReview = pipe(getSession(), RM.chainEitherKW(getPublishedReviewFromSession))

export const removePublishedReview = pipe(
  getSession<HeadersOpen>(),
  RM.map(RR.deleteAt('published-review')),
  RM.chainW(storeSession),
)
