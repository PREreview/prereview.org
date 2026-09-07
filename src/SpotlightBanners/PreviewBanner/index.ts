import { Array, Effect, Option, pipe, Schema } from 'effect'
import type { Locale } from '../../Context.ts'
import { Contentful, UsePreviewApi } from '../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../Queries.ts'
import type { SpotlightBanner } from '../Types.ts'
import { EntryToSpotlightBanner } from './EntryToSpotlightBanner.ts'

export const PreviewBanner: (
  id: string,
) => Effect.Effect<Option.Option<SpotlightBanner>, UnableToQuery, Contentful | Locale> = Effect.fnUntraced(
  function* (id) {
    const contentful = yield* Contentful

    const { items } = yield* contentful.getEntries({ content_type: 'banner', limit: 1, 'sys.id': id })

    if (!Array.isNonEmptyReadonlyArray(items)) {
      return Option.none()
    }

    return yield* Effect.asSome(Schema.decodeUnknown(EntryToSpotlightBanner)(items[0]))
  },
  Effect.provideService(UsePreviewApi, true),
  Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
    pipe(
      Effect.logError('Unable to preview banner'),
      Effect.annotateLogs({ error }),
      Effect.andThen(new UnableToQuery({ cause: error })),
    ),
  ),
)
