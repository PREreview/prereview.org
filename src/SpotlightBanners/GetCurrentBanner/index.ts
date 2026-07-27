import type { Effect, Option } from 'effect'
import type { Locale } from '../../Context.ts'
import type { UnableToQuery } from '../../Queries.ts'
import type { SpotlightBanner } from '../index.ts'

export declare const GetCurrentBanner: Effect.Effect<Option.Option<SpotlightBanner>, UnableToQuery, Locale>
