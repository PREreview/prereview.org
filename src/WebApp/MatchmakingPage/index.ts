import { Effect } from 'effect'
import { createMatchmakingPage } from './MatchmakingPage.ts'

export const MatchmakingPage = Effect.succeed(createMatchmakingPage(false))

export const MatchmakingSubmission = Effect.succeed(createMatchmakingPage(true))
