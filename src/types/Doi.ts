import * as Doi from 'doi-ts'
import { pipe, Schema } from 'effect'
import * as FptsToEffect from '../FptsToEffect.js'

export { Doi, isDoi, toUrl } from 'doi-ts'

export const DoiSchema: Schema.Schema<Doi.Doi, string> = pipe(Schema.String, Schema.filter(Doi.isDoi))

export const RegistrantDoiSchema = <R extends string>(
  ...registrants: ReadonlyArray<R>
): Schema.Schema<Doi.Doi<R>, string> => pipe(DoiSchema, Schema.filter(Doi.hasRegistrant(...registrants)))

export const parse = FptsToEffect.optionK(Doi.parse)
