import { Effect, Option, pipe } from 'effect'
import { createMatchmakingPage } from './MatchmakingPage.ts'
import { UrlParams } from '@effect/platform'
import * as Doi from '../../types/Doi.ts'

export const MatchmakingPage = Effect.succeed(createMatchmakingPage(Option.none(), false))

export const MatchmakingSubmission = Effect.fn(function* (input: UrlParams.UrlParams) {
  const doi = pipe(input, UrlParams.getLast('doi'), Option.andThen(Doi.parse))
  return yield* Effect.succeed(createMatchmakingPage(doi, true))
})
