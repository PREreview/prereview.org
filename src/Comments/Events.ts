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

export class PersonaForCommentWasChosen extends Schema.TaggedClass<PersonaForCommentWasChosen>()(
  'PersonaForCommentWasChosen',
  {
    persona: Schema.Literal('public', 'pseudonym'),
  },
) {}

export class CompetingInterestsForCommentWereDeclared extends Schema.TaggedClass<CompetingInterestsForCommentWereDeclared>()(
  'CompetingInterestsForCommentWereDeclared',
  { competingInterests: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema) },
) {}

export class CodeOfConductForCommentWasAgreed extends Schema.TaggedClass<CodeOfConductForCommentWasAgreed>()(
  'CodeOfConductForCommentWasAgreed',
  {},
) {}

export class ExistenceOfVerifiedEmailAddressForCommentWasConfirmed extends Schema.TaggedClass<ExistenceOfVerifiedEmailAddressForCommentWasConfirmed>()(
  'ExistenceOfVerifiedEmailAddressForCommentWasConfirmed',
  {},
) {}

export class PublicationOfCommentWasRequested extends Schema.TaggedClass<PublicationOfCommentWasRequested>()(
  'PublicationOfCommentWasRequested',
  {},
) {}

export class CommentWasAssignedADoi extends Schema.TaggedClass<CommentWasAssignedADoi>()('CommentWasAssignedADoi', {
  id: Schema.Number,
  doi: Doi.DoiSchema,
}) {}

export class CommentWasPublished extends Schema.TaggedClass<CommentWasPublished>()('CommentWasPublished', {}) {}

export type CommentEvent = typeof CommentEvent.Type

export const CommentEvent = Schema.Union(
  CommentWasStarted,
  CommentWasEntered,
  PersonaForCommentWasChosen,
  CompetingInterestsForCommentWereDeclared,
  CodeOfConductForCommentWasAgreed,
  ExistenceOfVerifiedEmailAddressForCommentWasConfirmed,
  PublicationOfCommentWasRequested,
  CommentWasAssignedADoi,
  CommentWasPublished,
)
