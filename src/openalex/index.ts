import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow } from 'fp-ts/function'
import { fieldIdFromOpenAlexId } from './ids'
import { getFields, getWorkByDoi } from './work'

export const getFieldsFromOpenAlex = flow(
  getWorkByDoi,
  RTE.bimap(() => 'unavailable' as const, flow(getFields, RA.filterMap(fieldIdFromOpenAlexId))),
)
