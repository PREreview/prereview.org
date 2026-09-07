import type { Record } from 'effect'
import { Slug } from '../../types/Slug.ts'

export type PageId = keyof typeof slugs

export const isPageId = (string: string): string is PageId => string in slugs

export const getSlugForPage = (page: PageId): Slug => slugs[page]

const slugs = {
  EdiaStatement: Slug('edia-statement'),
  Trainings: Slug('trainings'),
} satisfies Record.ReadonlyRecord<string, Slug>
