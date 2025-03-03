import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { revalidateIfStale, useStaleCache } from '../fetch.js'
import { getCategories, getWorkByDoi } from './work.js'

export const getCategoriesFromOpenAlex = flow(
  getWorkByDoi,
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.map(getCategories),
  RTE.orElseFirstW(error =>
    match(error)
      .with(
        { _tag: 'WorkIsUnavailable' },
        RTE.fromReaderIOK(() => L.error('Failed to get fields from OpenAlex')),
      )
      .otherwise(() => RTE.of(undefined)),
  ),
)
