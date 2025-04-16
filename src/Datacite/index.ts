import type { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import * as Preprint from '../preprint.js'
import { recordToPreprint } from './Preprint.js'
import type { IndeterminateDatacitePreprintId } from './PreprintId.js'
import { getRecord } from './Record.js'

export { isDatacitePreprintId } from './PreprintId.js'

export const getPreprintFromDatacite = (
  id: IndeterminateDatacitePreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  HttpClient.HttpClient
> =>
  pipe(
    getRecord(id.value),
    Effect.andThen(recordToPreprint),
    Effect.catchTags({
      RecordIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
      RecordIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
    }),
  )
