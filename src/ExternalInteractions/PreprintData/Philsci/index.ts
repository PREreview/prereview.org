import { Effect, pipe, flow } from 'effect'
import { Philsci } from '../../../ExternalApis/index.ts'
import * as Preprints from '../../../Domain/Preprints/index.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { EprintToPreprint } from './EprintToPreprint.ts'

export const getPreprintFromPhilsci = (
  id: Preprints.PhilsciPreprintId,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Philsci.Philsci
> =>
  pipe(
    Philsci.getEprint(id.value),
    Effect.andThen(flow(EprintToPreprint, Effect.fromResult)),
    Effect.catchIf(
      error =>
        error._tag === 'HttpClientError' &&
        error.reason._tag === 'StatusCodeError' &&
        error.reason.response.status === StatusCodes.NotFound,
      error => new Preprints.PreprintIsNotFound({ cause: error }),
    ),
    Effect.catchTag(['SchemaError', 'HttpClientError'], error => new Preprints.PreprintIsUnavailable({ cause: error })),
    Effect.tapErrorTag('PreprintIsUnavailable', error =>
      Effect.logError('Failed to get preprint from PhilSci-Archive').pipe(Effect.annotateLogs({ error })),
    ),
  )
