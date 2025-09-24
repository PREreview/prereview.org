import { FetchHttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { Crossref } from '../../ExternalApis/index.ts'
import * as FptsToEffect from '../../FptsToEffect.ts'
import * as Preprint from '../Preprint.ts'
import type { IndeterminatePreprintId } from '../PreprintId.ts'
import * as LegacyCrossref from './legacy-crossref.ts'
import { workToPreprint } from './Preprint.ts'
import { type IndeterminateCrossrefPreprintId, isCrossrefPreprintId as isCrossrefPreprintId_ } from './PreprintId.ts'

export const isCrossrefPreprintId = (
  id: IndeterminatePreprintId,
): id is IndeterminateCrossrefPreprintId | LegacyCrossref.IndeterminateCrossrefPreprintId =>
  isCrossrefPreprintId_(id) || (id._tag !== 'PhilsciPreprintId' && LegacyCrossref.isCrossrefPreprintDoi(id.value))

export const getPreprintFromCrossref = (
  id: IndeterminateCrossrefPreprintId | LegacyCrossref.IndeterminateCrossrefPreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  Crossref.Crossref | FetchHttpClient.Fetch
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
