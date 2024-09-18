import { Schema } from '@effect/schema'
import { isDoi, type Doi } from 'doi-ts'
import { pipe } from 'effect'
import { isOrcid, type Orcid } from 'orcid-id-ts'
import { rawHtml, type Html } from '../html.js'

const DoiSchema: Schema.Schema<Doi, string> = pipe(Schema.String, Schema.filter(isDoi))

const OrcidSchema: Schema.Schema<Orcid, string> = pipe(Schema.String, Schema.filter(isOrcid))

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.Any, {
  strict: true,
  decode: rawHtml,
  encode: String,
})

export class FeedbackWasStarted extends Schema.TaggedClass<FeedbackWasStarted>()('FeedbackWasStarted', {
  prereviewId: Schema.Number,
  authorId: OrcidSchema,
}) {}

export class FeedbackWasEntered extends Schema.TaggedClass<FeedbackWasEntered>()('FeedbackWasEntered', {
  feedback: HtmlSchema,
}) {}

export class FeedbackWasPublished extends Schema.TaggedClass<FeedbackWasPublished>()('FeedbackWasPublished', {
  id: Schema.Number,
  doi: DoiSchema,
}) {}

export type FeedbackEvent = typeof FeedbackEvent.Type

export const FeedbackEvent = Schema.Union(FeedbackWasStarted, FeedbackWasEntered, FeedbackWasPublished)
