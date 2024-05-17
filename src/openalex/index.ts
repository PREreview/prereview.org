import * as RA from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'
import { fieldIdFromOpenAlexId } from './ids'
import { getFields, getWorkByDoi } from './work'

export const getFieldsFromOpenAlex = flow(getWorkByDoi, TE.map(flow(getFields, RA.filterMap(fieldIdFromOpenAlexId))))
