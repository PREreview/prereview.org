import type { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { SubscribeToKeywordsPage as MakeResponse } from './SubscribeToKeywordsPage.ts'

export const SubscribeToKeywordsPage = Effect.succeed(MakeResponse())

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const SubscribeToKeywordsSubmission = ({ body }: { body: UrlParams.UrlParams }) => HavingProblemsPage
