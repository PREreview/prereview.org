import { Effect, pipe } from 'effect'
import { Datacite } from '../../ExternalApis/index.ts'
import * as Preprint from '../Preprint.ts'
import { recordToPreprint } from './Preprint.ts'
import type { IndeterminateDatacitePreprintId } from './PreprintId.ts'

export { isDatacitePreprintId } from './PreprintId.ts'

export const getPreprintFromDatacite = (
  id: IndeterminateDatacitePreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  Datacite.Datacite
> =>
  pipe(
    Datacite.getRecord(id.value),
    Effect.andThen(recordToPreprint),
    Effect.catchTags({
      RecordIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
      RecordIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
    }),
  )
