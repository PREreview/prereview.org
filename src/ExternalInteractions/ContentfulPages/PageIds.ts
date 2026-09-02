import type { Record } from 'effect'
import { ContentfulId } from '../../ExternalApis/Contentful/index.ts'

export type PageId = keyof typeof pageIds

export const isPageId = (string: string): string is PageId => string in pageIds

export const getContentfulIdForPage = (page: PageId): ContentfulId => pageIds[page]

const pageIds = {
  Funding: ContentfulId.make('6lAbGsGtjCEbDa9zuXrUa5'),
} satisfies Record.ReadonlyRecord<string, ContentfulId>
