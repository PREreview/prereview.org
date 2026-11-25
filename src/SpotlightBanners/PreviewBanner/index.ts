import { Array, Effect, Option, pipe, Schema } from 'effect'
import type { Locale } from '../../Context.ts'
import { Queries } from '../../Domain/Events/index.ts'
import { Contentful, UsePreviewApi } from '../../ExternalApis/Contentful/index.ts'
import { EntryToSpotlightBanner } from '../EntryToSpotlightBanner.ts'
import type { SpotlightBanner } from '../Types.ts'

export const PreviewBanner: (
  id: string,
) => Effect.Effect<Option.Option<SpotlightBanner>, Queries.UnableToQuery, Contentful | Locale> = Effect.fnUntraced(
  function* (id) {
    const contentful = yield* Contentful

    const { items } = yield* contentful.getEntries({ content_type: 'banner', limit: 1, 'sys.id': id })

    if (!Array.isReadonlyArrayNonEmpty(items)) {
      return Option.none()
    }

    return yield* Effect.asSome(Schema.decodeUnknownEffect(EntryToSpotlightBanner)(items[0]))
  },
  Effect.provideService(UsePreviewApi, true),
  Effect.catchTag(['ContentfulIsUnavailable', 'SchemaError'], error =>
    pipe(
      Effect.logError('Unable to preview banner'),
      Effect.annotateLogs({ error }),
      Effect.andThen(new Queries.UnableToQuery({ cause: error })),
    ),
  ),
)
