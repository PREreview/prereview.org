import type { UrlParams } from '@effect/platform'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'

export const SubscribeToKeywordsPage = HavingProblemsPage

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const SubscribeToKeywordsSubmission = ({ body }: { body: UrlParams.UrlParams }) => HavingProblemsPage
