import { flow, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import { P, match } from 'ts-pattern'
import { revalidateIfStale, useStaleCache } from '../fetch.js'
import { getCategories, getWorkByDoi } from './work.js'

export const getCategoriesFromOpenAlex = flow(
  getWorkByDoi,
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.map(getCategories),
  RTE.orLeftW(error =>
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
