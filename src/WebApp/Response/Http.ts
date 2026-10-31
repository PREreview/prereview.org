import { Array, Effect, pipe, Record, Schema, SchemaGetter, SchemaIssue } from 'effect'

export const LinkHeaderSchema = Schema.NonEmptyString.pipe(
  Schema.decodeTo(
    Schema.NonEmptyArray(
      Schema.NonEmptyString.pipe(
        Schema.decodeTo(
          Schema.StructWithRest(Schema.Struct({ uri: Schema.String, rel: Schema.NonEmptyString }), [
            Schema.Record(Schema.NonEmptyString, Schema.NonEmptyString),
          ]),
          {
            decode: SchemaGetter.transformEffect(actual =>
              Effect.fail(new SchemaIssue.Forbidden({ message: 'cannot decode a link header entry' }, actual)),
            ),
            encode: SchemaGetter.transformEffect(({ uri, rel, ...rest }) =>
              Effect.succeed(
                pipe(
                  Record.reduce(rest, [`<${uri}>`, `rel="${rel}"`], (parts, value, key) =>
                    Array.append(parts, `${key}="${value}"`),
                  ),
                  Array.join('; '),
                ),
              ),
            ),
          },
        ),
      ),
    ),
    {
      decode: SchemaGetter.transformEffect(actual =>
        Effect.fail(new SchemaIssue.Forbidden({ message: 'cannot decode a link header' }, actual)),
      ),
      encode: SchemaGetter.transformEffect(entries => Effect.succeed(Array.join(entries, ', '))),
    },
  ),
)
