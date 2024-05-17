import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import { P, match } from 'ts-pattern'
import { fieldIdFromOpenAlexId } from './ids'
import { getFields, getWorkByDoi } from './work'

export const getFieldsFromOpenAlex = flow(
  getWorkByDoi,
  RTE.map(flow(getFields, RA.filterMap(fieldIdFromOpenAlexId))),
  orLeftW(error =>
    match(error)
      .with({ _tag: 'NetworkError' }, ({ error }) =>
        pipe(
          RT.of('unavailable' as const),
          RT.chainFirstReaderIOK(() => L.errorP('Failed to get fields from OpenAlex')({ error: error.message })),
        ),
      )
      .with({ _tag: 'UnableToDecodeBody' }, ({ error }) =>
        pipe(
          RT.of('unavailable' as const),
          RT.chainFirstReaderIOK(() => L.errorP('Failed to get fields from OpenAlex')({ error: D.draw(error) })),
        ),
      )
      .with({ _tag: 'UnexpectedStatusCode', actual: P.union(Status.NotFound, Status.Gone) }, () =>
        RT.of('not-found' as const),
      )
      .with({ _tag: 'UnexpectedStatusCode' }, ({ actual }) =>
        pipe(
          RT.of('unavailable' as const),
          RT.chainFirstReaderIOK(() => L.errorP('Failed to get fields from OpenAlex')({ status: actual })),
        ),
      )
      .exhaustive(),
  ),
)

// https://github.com/gcanti/fp-ts/pull/1938
function orLeftW<E1, R2, E2>(
  onLeft: (e: E1) => RT.ReaderTask<R2, E2>,
): <R1, A>(fa: RTE.ReaderTaskEither<R1, E1, A>) => ReaderTaskEither<R1 & R2, E2, A> {
  return RTE.orLeft(onLeft) as never
}
