import * as Doi from 'doi-ts'
import { type Equivalence, pipe, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'

export { Doi, getRegistrant, hasRegistrant, isDoi, toUrl } from 'doi-ts'

export const DoiSchema: Schema.Codec<Doi.Doi, string> = pipe(Schema.String, Schema.refine(Doi.isDoi))

export const RegistrantDoiSchema = <R extends string>(
  ...registrants: ReadonlyArray<R>
): Schema.Codec<Doi.Doi<R>, string> & { readonly registrants: ReadonlyArray<R> } =>
  Object.assign(pipe(DoiSchema, Schema.refine(Doi.hasRegistrant(...registrants))), { registrants })

export const DoiFromUrlSchema: Schema.Codec<Doi.Doi, string> = Schema.URLFromString.pipe(
  Schema.decodeTo(Schema.toType(DoiSchema), {
    decode: SchemaGetter.transformEffect(s =>
      Effect.fromOption(parse(s.href), () => new SchemaIssue.InvalidValue(undefined, s)),
    ),
    encode: SchemaGetter.transformEffect(doi => Effect.succeed(Doi.toUrl(doi))),
  }),
)

export const parse = FptsToEffect.optionK(Doi.parse)

export const DoiEquivalence: Equivalence.Equivalence<Doi.Doi> = FptsToEffect.eq(Doi.Eq)

export type Registrant<D extends Doi.Doi> = D extends Doi.Doi<infer R> ? R : never

export const DoiC = C.fromDecoder(D.fromRefinement(Doi.isDoi, 'DOI'))
