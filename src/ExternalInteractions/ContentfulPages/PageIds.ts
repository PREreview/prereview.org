import type { Record } from 'effect'
import { ContentfulId } from '../../ExternalApis/Contentful/index.ts'

export type PageId = keyof typeof pageIds

export const isPageId = (string: string): string is PageId => string in pageIds

export const getContentfulIdForPage = (page: PageId): ContentfulId => pageIds[page]

const pageIds = {
  EdiaStatement: ContentfulId.make('7zDPW858MYfLUInrNhezEj'),
  Trainings: ContentfulId.make('42cK6fgeypGN3ttfUmWNAw'),
} satisfies Record.ReadonlyRecord<string, ContentfulId>
