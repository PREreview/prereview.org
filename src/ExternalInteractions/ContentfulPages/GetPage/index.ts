import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { Contentful } from '../../../ExternalApis/Contentful/index.ts'
import type { UnableToQuery } from '../../../Queries.ts'
import type { PageId } from '../PageIds.ts'
import type { ContentfulPage } from '../Types.ts'

export declare const GetPage: (pageId: PageId) => Effect.Effect<ContentfulPage, UnableToQuery, Contentful | Locale>
