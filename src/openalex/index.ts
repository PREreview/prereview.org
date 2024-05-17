import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import { P, match } from 'ts-pattern'
import { fieldIdFromOpenAlexId } from './ids'
import { getFields, getWorkByDoi } from './work'

export const getFieldsFromOpenAlex = flow(
  getWorkByDoi,
  RTE.orElseFirstW(
    flow(
      error =>
        match(error)
          .with({ _tag: 'NetworkError', error: P.select() }, error => ({ error: error.message }))
          .with({ _tag: 'UnableToDecodeBody', error: P.select() }, error => ({ error: D.draw(error) }))
          .with({ _tag: 'UnexpectedStatusCode', actual: P.select() }, status => ({ status }))
          .exhaustive(),
      RTE.fromReaderIOK(L.errorP('Failed to get fields from OpenAlex')),
    ),
  ),
  RTE.bimap(() => 'unavailable' as const, flow(getFields, RA.filterMap(fieldIdFromOpenAlexId))),
)
