import type { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import * as Preprint from '../../preprint.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { PhilsciPreprintId } from '../../types/preprint-id.js'
import { GetEprint } from '../GetEprint/index.js'
import { EprintToPreprint } from './EprintToPreprint.js'

export const GetPreprint = (
  id: PhilsciPreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  HttpClient.HttpClient
> =>
  pipe(
    GetEprint(id.value),
    Effect.andThen(EprintToPreprint),
    Effect.catchIf(
      error =>
        error._tag === 'ResponseError' &&
        error.reason === 'StatusCode' &&
        error.response.status === StatusCodes.NotFound,
      error => new Preprint.PreprintIsNotFound({ cause: error }),
    ),
    Effect.catchTag(
      'ParseError',
      'RequestError',
      'ResponseError',
      error => new Preprint.PreprintIsUnavailable({ cause: error }),
    ),
  )
