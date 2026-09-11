import { Array, Effect, pipe, Schema } from 'effect'
import type { ClubName } from '../../../Clubs/index.ts'
import type { Locale } from '../../../Context.ts'
import { Contentful, ContentfulIsUnavailable, UsePreviewApi } from '../../../ExternalApis/Contentful/index.ts'
import { DefaultLocale } from '../../../locales/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import type { Slug } from '../../../types/Slug.ts'
import { ContentfulPage } from '../Types.ts'
import { addListOfClubs } from './AddListOfClubs.ts'
import { EntryToContentfulPage } from './EntryToContentfulPage.ts'

export const GetPage = (
  clubs: Array.NonEmptyReadonlyArray<ClubName & { readonly status: 'active' | 'inactive' }>,
): ((slug: Slug, preview?: boolean) => Effect.Effect<ContentfulPage, UnableToQuery, Contentful | Locale>) =>
  Effect.fn('ContentfulPages.getPage')(
    function* (slug, preview = false) {
      yield* Effect.annotateCurrentSpan({ slug })

      const contentful = yield* Contentful

      const { items } = yield* contentful
        .getEntries({
          content_type: 'page',
          limit: 1,
          'fields.slug': slug,
        })
        .pipe(Effect.provideService(UsePreviewApi, preview))

      if (!Array.isNonEmptyReadonlyArray(items)) {
        return yield* new ContentfulIsUnavailable({ cause: 'page is not found' })
      }

      const page = yield* Schema.decodeUnknown(EntryToContentfulPage)(items[0])

      return new ContentfulPage({
        title: page.title,
        html: addListOfClubs(DefaultLocale, clubs)(page.html),
        locale: page.locale,
      })
    },
    Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
      pipe(
        Effect.logError('Unable to get page'),
        Effect.annotateLogs({ error }),
        Effect.andThen(new UnableToQuery({ cause: error })),
      ),
    ),
  )
