import { Schema } from 'effect'
import { Html, rawHtml } from '../html.js'
import { Doi, NonEmptyString, Orcid } from '../types/index.js'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: rawHtml,
  encode: String,
})

export class CommentWasStarted extends Schema.TaggedClass<CommentWasStarted>()('CommentWasStarted', {
  prereviewId: Schema.Number,
  authorId: Orcid.OrcidSchema,
}) {}

export class CommentWasEntered extends Schema.TaggedClass<CommentWasEntered>()('CommentWasEntered', {
  comment: HtmlSchema,
}) {}

export class PersonaWasChosen extends Schema.TaggedClass<PersonaWasChosen>()('PersonaWasChosen', {
  persona: Schema.Literal('public', 'pseudonym'),
}) {}

export class CompetingInterestsWereDeclared extends Schema.TaggedClass<CompetingInterestsWereDeclared>()(
  'CompetingInterestsWereDeclared',
  { competingInterests: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema) },
) {}

export class CodeOfConductWasAgreed extends Schema.TaggedClass<CodeOfConductWasAgreed>()(
  'CodeOfConductWasAgreed',
  {},
) {}

export class ExistenceOfVerifiedEmailAddressWasConfirmed extends Schema.TaggedClass<ExistenceOfVerifiedEmailAddressWasConfirmed>()(
  'ExistenceOfVerifiedEmailAddressWasConfirmed',
  {},
) {}

export class CommentPublicationWasRequested extends Schema.TaggedClass<CommentPublicationWasRequested>()(
  'CommentPublicationWasRequested',
  {},
) {}

export class DoiWasAssigned extends Schema.TaggedClass<DoiWasAssigned>()('DoiWasAssigned', {
  id: Schema.Number,
  doi: Doi.DoiSchema,
}) {}

export class CommentWasPublished extends Schema.TaggedClass<CommentWasPublished>()('CommentWasPublished', {}) {}

export type CommentEvent = typeof CommentEvent.Type

export const CommentEvent = Schema.Union(
  CommentWasStarted,
  CommentWasEntered,
  PersonaWasChosen,
  CompetingInterestsWereDeclared,
  CodeOfConductWasAgreed,
  ExistenceOfVerifiedEmailAddressWasConfirmed,
  CommentPublicationWasRequested,
  DoiWasAssigned,
  CommentWasPublished,
)
