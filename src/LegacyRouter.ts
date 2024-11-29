import { Headers, HttpRouter, HttpServerResponse } from '@effect/platform'
import type { Doi } from 'doi-ts'
import { Effect, pipe, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import * as Routes from './routes.js'

export const LegacyRouter = pipe(
  HttpRouter.empty,
  HttpRouter.all(
    '/10.1101/:suffix',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
      Effect.andThen(({ suffix }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: {
              type: 'biorxiv-medrxiv',
              value: `10.1101/${suffix}` as Doi<'1101'>,
            },
          }),
        ),
      ),
    ),
  ),
)

const movedPermanently = (location: string) =>
  HttpServerResponse.empty({
    status: StatusCodes.MOVED_PERMANENTLY,
    headers: Headers.fromInput({ location }),
  })
