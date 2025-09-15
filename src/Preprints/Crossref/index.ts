import { FetchHttpClient, type HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { Crossref } from '../../ExternalApis/index.js'
import * as FptsToEffect from '../../FptsToEffect.js'
import * as Preprint from '../../preprint.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import { workToPreprint } from './Preprint.js'
import { type IndeterminateCrossrefPreprintId, isCrossrefPreprintId as isCrossrefPreprintId_ } from './PreprintId.js'
import * as LegacyCrossref from './legacy-crossref.js'

export const isCrossrefPreprintId = (
  id: IndeterminatePreprintId,
): id is IndeterminateCrossrefPreprintId | LegacyCrossref.IndeterminateCrossrefPreprintId =>
  isCrossrefPreprintId_(id) || (id._tag !== 'PhilsciPreprintId' && LegacyCrossref.isCrossrefPreprintDoi(id.value))

export const getPreprintFromCrossref = (
  id: IndeterminateCrossrefPreprintId | LegacyCrossref.IndeterminateCrossrefPreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  HttpClient.HttpClient | FetchHttpClient.Fetch
> =>
  Effect.if(LegacyCrossref.isCrossrefPreprintDoi(id.value), {
    onTrue: () =>
      Effect.gen(function* () {
        const fetch = yield* FetchHttpClient.Fetch

        return yield* FptsToEffect.readerTaskEither(LegacyCrossref.getPreprintFromCrossref(id as never), { fetch })
      }),
    onFalse: () =>
      pipe(
        Crossref.getWork(id.value),
        Effect.andThen(workToPreprint),
        Effect.catchTags({
          WorkIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
          WorkIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
        }),
      ),
  })
