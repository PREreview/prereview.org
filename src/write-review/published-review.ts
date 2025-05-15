import { type Doi, isDoi } from 'doi-ts'
import { flow, pipe, Record } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import type { HeadersOpen } from 'hyper-ts'
import { getSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { addToSession } from '../session.js'
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
  Record.get<string>('published-review'),
  E.fromOption(() => 'no-published-review' as const),
  E.chainW(PublishedReviewC.decode),
  E.mapLeft(() => 'no-published-review' as const),
)

export const storeInformationForWriteReviewPublishedPage = (doi: Doi, id: number, form: CompletedForm) =>
  addToSession('published-review', PublishedReviewC.encode({ doi, id, form }))

export const getPublishedReview = pipe(getSession(), RM.chainEitherKW(getPublishedReviewFromSession))

export const removePublishedReview = pipe(
  getSession<HeadersOpen>(),
  RM.map(Record.remove<string, string>('published-review')),
  RM.chainW(storeSession),
)
