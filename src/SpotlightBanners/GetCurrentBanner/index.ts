import { Array, Effect, Option, pipe, Schema } from 'effect'
import type { Locale } from '../../Context.ts'
import { Contentful } from '../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../Queries.ts'
import type { SpotlightBanner } from '../Types.ts'
import { EntryToSpotlightBanner } from './EntryToSpotlightBanner.ts'

export const GetCurrentBanner: Effect.Effect<
  Option.Option<SpotlightBanner>,
  UnableToQuery,
  Contentful | Locale
> = Effect.gen(function* () {
  const contentful = yield* Contentful

  const { items } = yield* contentful.getEntries({
    content_type: 'banner',
    limit: 1,
    order: 'sys.createdAt',
  })

  if (!Array.isNonEmptyReadonlyArray(items)) {
    return Option.none()
  }

  return yield* Effect.asSome(Schema.decodeUnknown(EntryToSpotlightBanner)(items[0]))
}).pipe(
  Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
    pipe(
      Effect.logError('Unable to get current banner'),
      Effect.annotateLogs({ error }),
      Effect.andThen(new UnableToQuery({ cause: error })),
    ),
  ),
)
