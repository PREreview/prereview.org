import type { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import type { PageResponse } from '../Response/index.ts'
import { createHavingProblemsPage } from './HavingProblemsPage.ts'

export const HavingProblemsPage: Effect.Effect<PageResponse, never, Locale> = Locale.useSync(createHavingProblemsPage)
