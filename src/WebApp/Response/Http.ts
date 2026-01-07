import { Array, ParseResult, pipe, Record, Schema } from 'effect'

export const LinkHeaderSchema = Schema.transformOrFail(
  Schema.NonEmptyString,
  Schema.NonEmptyArray(
    Schema.transformOrFail(
      Schema.NonEmptyString,
      Schema.Struct(
        { uri: Schema.String, rel: Schema.NonEmptyString },
        { key: Schema.NonEmptyString, value: Schema.NonEmptyString },
      ),
      {
        strict: true,
        decode: (actual, _, ast) =>
          ParseResult.fail(new ParseResult.Forbidden(ast, actual, 'cannot decode a link header entry')),
        encode: ({ uri, rel, ...rest }) =>
          ParseResult.succeed(
            pipe(
              Record.reduce(rest, [`<${uri}>`, `rel="${rel}"`], (parts, value, key) =>
                Array.append(parts, `${key}="${value}"`),
              ),
              Array.join('; '),
            ),
          ),
      },
    ),
  ),
  {
    strict: true,
    decode: (actual, _, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, actual, 'cannot decode a link header')),
    encode: entries => ParseResult.succeed(Array.join(entries, ', ')),
  },
)
