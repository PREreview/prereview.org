import * as Doi from 'doi-ts'
import { Either, type Equivalence, ParseResult, pipe, Schema } from 'effect'
import * as FptsToEffect from '../FptsToEffect.ts'

export { Doi, hasRegistrant, isDoi, toUrl } from 'doi-ts'

export const DoiSchema: Schema.Schema<Doi.Doi, string> = pipe(Schema.String, Schema.filter(Doi.isDoi))

export const RegistrantDoiSchema = <R extends string>(
  ...registrants: ReadonlyArray<R>
): Schema.Schema<Doi.Doi<R>, string> => pipe(DoiSchema, Schema.filter(Doi.hasRegistrant(...registrants)))

export const DoiFromUrlSchema: Schema.Schema<Doi.Doi, string> = Schema.transformOrFail(
  Schema.URL,
  Schema.typeSchema(DoiSchema),
  {
    decode: s => Either.fromOption(parse(s.href), () => new ParseResult.Type(DoiSchema.ast, s)),
    encode: doi => ParseResult.succeed(Doi.toUrl(doi)),
  },
)

export const parse = FptsToEffect.optionK(Doi.parse)

export const DoiEquivalence: Equivalence.Equivalence<Doi.Doi> = FptsToEffect.eq(Doi.Eq)
