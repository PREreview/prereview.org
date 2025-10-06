import * as Doi from 'doi-ts'
import { type Equivalence, pipe, Schema } from 'effect'
import * as FptsToEffect from '../FptsToEffect.ts'

export { Doi, hasRegistrant, isDoi, toUrl } from 'doi-ts'

export const DoiSchema: Schema.Schema<Doi.Doi, string> = pipe(Schema.String, Schema.filter(Doi.isDoi))

export const RegistrantDoiSchema = <R extends string>(
  ...registrants: ReadonlyArray<R>
): Schema.Schema<Doi.Doi<R>, string> => pipe(DoiSchema, Schema.filter(Doi.hasRegistrant(...registrants)))

export const parse = FptsToEffect.optionK(Doi.parse)

export const DoiEquivalence: Equivalence.Equivalence<Doi.Doi> = FptsToEffect.eq(Doi.Eq)
