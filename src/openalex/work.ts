import { type Doi, toUrl } from 'doi-ts'
import { Data, Either, Equivalence, flow, Match, pipe, Schema, String, Struct } from 'effect'
import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { Status } from 'hyper-ts'
import * as EffectToFpTs from '../EffectToFpts.js'
import { timeoutRequest } from '../fetch.js'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
      subfield: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      field: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      domain: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
    }),
  ),
})

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}

export const getWorkByDoi: (doi: Doi) => RTE.ReaderTaskEither<F.FetchEnv, WorkIsNotFound | WorkIsUnavailable, Work> =
  flow(
    doi => `https://api.openalex.org/works/${toUrl(doi).href}`,
    F.Request('GET'),
    F.send,
    RTE.local(timeoutRequest(2000)),
    RTE.mapLeft(error => new WorkIsUnavailable({ cause: error })),
    RTE.filterOrElseW(
      F.hasStatus(Status.OK),
      pipe(
        Match.type<F.Response>(),
        Match.when(
          { status: Match.is(Status.NotFound, Status.Gone) },
          response => new WorkIsNotFound({ cause: response }),
        ),
        Match.orElse(response => new WorkIsUnavailable({ cause: response })),
      ),
    ),
    RTE.chainTaskEitherKW(F.getText(error => new WorkIsUnavailable({ cause: error }))),
    RTE.chainEitherKW(
      flow(
        Schema.decodeEither(Schema.parseJson(WorkSchema)),
        Either.mapLeft(error => new WorkIsUnavailable({ cause: error })),
      ),
    ),
  )

const UrlEquivalence: Equivalence.Equivalence<URL> = Equivalence.mapInput(String.Equivalence, url => url.href)

export const getCategories: (work: Work) => ReadonlyArray<{ id: URL; display_name: string }> = flow(
  work => work.topics,
  RA.flatMap(topic => [
    { id: topic.id, display_name: topic.display_name },
    { id: topic.subfield.id, display_name: topic.subfield.display_name },
    { id: topic.field.id, display_name: topic.field.display_name },
    { id: topic.domain.id, display_name: topic.domain.display_name },
  ]),
  RA.uniq(EffectToFpTs.eq(Equivalence.mapInput(UrlEquivalence, Struct.get('id')))),
)
