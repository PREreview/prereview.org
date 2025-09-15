import { FetchHttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { Datacite } from '../../ExternalApis/index.js'
import * as FptsToEffect from '../../FptsToEffect.js'
import * as Preprint from '../Preprint.js'
import type { IndeterminatePreprintId } from '../PreprintId.js'
import * as LegacyDatacite from './legacy-datacite.js'
import { recordToPreprint } from './Preprint.js'
import { type IndeterminateDatacitePreprintId, isDatacitePreprintId as isDatacitePreprintId_ } from './PreprintId.js'

export const isDatacitePreprintId = (
  id: IndeterminatePreprintId,
): id is IndeterminateDatacitePreprintId | LegacyDatacite.IndeterminateDatacitePreprintId =>
  isDatacitePreprintId_(id) || (id._tag !== 'PhilsciPreprintId' && LegacyDatacite.isDatacitePreprintDoi(id.value))

export const getPreprintFromDatacite = (
  id: IndeterminateDatacitePreprintId | LegacyDatacite.IndeterminateDatacitePreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  Datacite.Datacite | FetchHttpClient.Fetch
> =>
  Effect.if(LegacyDatacite.isDatacitePreprintDoi(id.value), {
    onTrue: () =>
      Effect.gen(function* () {
        const fetch = yield* FetchHttpClient.Fetch

        return yield* FptsToEffect.readerTaskEither(LegacyDatacite.getPreprintFromDatacite(id as never), { fetch })
      }),
    onFalse: () =>
      pipe(
        Datacite.getRecord(id.value),
        Effect.andThen(recordToPreprint),
        Effect.catchTags({
          RecordIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
          RecordIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
        }),
      ),
  })
