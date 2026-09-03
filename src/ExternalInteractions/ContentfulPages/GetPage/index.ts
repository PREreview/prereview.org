import { Array, Effect, pipe, Schema } from 'effect'
import { Contentful, ContentfulIsUnavailable } from '../../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import { getContentfulIdForPage, type PageId } from '../PageIds.ts'
import type { ContentfulPage } from '../Types.ts'
import { EntryToContentfulPage } from './EntryToContentfulPage.ts'

export const GetPage: (pageId: PageId) => Effect.Effect<ContentfulPage, UnableToQuery, Contentful> = Effect.fn(
  'ContentfulPages.getPage',
)(
  function* (pageId) {
    yield* Effect.annotateCurrentSpan({ pageId })

    const contentful = yield* Contentful

    const { items } = yield* contentful.getEntries({ limit: 1, 'sys.id': getContentfulIdForPage(pageId) })

    if (!Array.isNonEmptyReadonlyArray(items)) {
      return yield* new ContentfulIsUnavailable({ cause: 'page is not found' })
    }

    return yield* Schema.decodeUnknown(EntryToContentfulPage)(items[0])
  },
  Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
    pipe(
      Effect.logError('Unable to get page'),
      Effect.annotateLogs({ error }),
      Effect.andThen(new UnableToQuery({ cause: error })),
    ),
  ),
)
