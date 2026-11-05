import type { UrlParams } from 'effect/http'
import { Data, Effect, Schema } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type LocationForm = EmptyForm | CompletedForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  location: NonEmptyString.NonEmptyString
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { location } = yield* Schema.decodeEffect(LocationFieldSchema)(body)

    return new CompletedForm({ location })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new EmptyForm())),
)

const LocationFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      location: NonEmptyString.NonEmptyStringSchema,
    }),
  ),
)
