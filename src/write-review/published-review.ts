import { Doi, isDoi } from 'doi-ts'
import { Json, JsonRecord } from 'fp-ts/Json'
import * as O from 'fp-ts/Option'
import { Option } from 'fp-ts/Option'
import * as RR from 'fp-ts/ReadonlyRecord'
import { Lazy, flow, pipe } from 'fp-ts/function'
import { HeadersOpen } from 'hyper-ts'
import { getSession, storeSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { CompletedForm, CompletedFormC } from './completed-form'

export type PublishedReview = C.TypeOf<typeof PublishedReviewC>

const DoiC = C.make(pipe(D.string, D.refine(isDoi, 'DOI')), { encode: String })

export const PublishedReviewC: C.Codec<unknown, JsonRecord, { doi: Doi; form: CompletedForm; id: number }> = C.struct({
  doi: DoiC,
  form: CompletedFormC,
  id: C.number,
})

export const storePublishedReviewInSession = (publishedReview: PublishedReview, session: JsonRecord): JsonRecord =>
  pipe(session, RR.upsertAt('published-review', PublishedReviewC.encode(publishedReview) as Json))

export const getPublishedReviewFromSession: (session: JsonRecord) => O.Option<PublishedReview> = flow(
  RR.lookup('published-review'),
  O.chainEitherK(PublishedReviewC.decode),
)

export const storeInformationForWriteReviewPublishedPage = (doi: Doi, id: number, form: CompletedForm) =>
  pipe(
    getSession<HeadersOpen>(),
    RM.map(session => storePublishedReviewInSession({ doi, form, id }, session)),
    RM.chainW(storeSession),
  )

export const getPublishedReview = pipe(
  getSession(),
  chainOptionKW(() => 'no-published-review' as const)(getPublishedReviewFromSession),
)

// https://github.com/DenisFrezzato/hyper-ts/pull/80
function chainOptionKW<E2>(
  onNone: Lazy<E2>,
): <A, B>(
  f: (a: A) => Option<B>,
) => <R, I, E1>(ma: RM.ReaderMiddleware<R, I, I, E1, A>) => RM.ReaderMiddleware<R, I, I, E1 | E2, B> {
  return f => RM.ichainMiddlewareKW((...a) => M.fromOption(onNone)(f(...a)))
}
