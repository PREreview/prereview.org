import type { Effect } from 'effect'
import type { CmsContent } from '../../CmsContent/index.ts'
import type { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import type { PageResponse } from '../Response/index.ts'

export const BlogPage: (query: { page: number }) => Effect.Effect<PageResponse, never, CmsContent | Locale> = () =>
  HavingProblemsPage
