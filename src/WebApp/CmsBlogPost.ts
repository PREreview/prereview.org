import { Effect } from 'effect'
import type { Locale } from '../Context.ts'
import type { Slug } from '../types/Slug.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import type { Response } from './Response/index.ts'

export const CmsBlogPostPage: (args: {
  slug: Slug
  preview?: boolean
}) => Effect.Effect<Response, never, Locale> = () => HavingProblemsPage
