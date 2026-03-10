import { Effect } from 'effect'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { SubscribeToKeywordsPage as MakeResponse } from './SubscribeToKeywordsPage.ts'

export const SubscribeToKeywordsPage = Effect.succeed(MakeResponse())

export const SubscribeToKeywordsSubmission = () => HavingProblemsPage
