import { Effect } from 'effect'
import { createMatchmakingPage } from './MatchmakingPage.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'

export const MatchmakingPage = Effect.succeed(createMatchmakingPage())

export const MatchmakingSubmission = HavingProblemsPage
