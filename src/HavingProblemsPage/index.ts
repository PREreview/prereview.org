import { Effect } from 'effect'
import type { PageResponse } from '../response.js'
import { createHavingProblemsPage } from './HavingProblemsPage.js'

export const HavingProblemsPage: Effect.Effect<PageResponse> = Effect.sync(createHavingProblemsPage)
