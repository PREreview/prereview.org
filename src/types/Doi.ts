import * as Doi from 'doi-ts'
import { pipe, Schema } from 'effect'

export type { Doi } from 'doi-ts'

export const DoiSchema: Schema.Schema<Doi.Doi, string> = pipe(Schema.String, Schema.filter(Doi.isDoi))
