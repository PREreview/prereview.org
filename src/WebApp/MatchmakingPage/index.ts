import { Effect } from 'effect'
import { createMatchmakingPage } from './MatchmakingPage.ts'

export const MatchmakingPage = Effect.succeed(createMatchmakingPage())
