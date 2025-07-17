import { Schema } from 'effect'
import { Html, rawHtml } from '../html.js'
import { Doi, NonEmptyString, Orcid, Uuid } from '../types/index.js'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: rawHtml,
  encode: String,
})

export class CommentWasStarted extends Schema.TaggedClass<CommentWasStarted>()('CommentWasStarted', {
  prereviewId: Schema.Number,
  authorId: Orcid.OrcidSchema,
  commentId: Uuid.UuidSchema,
}) {}

export class CommentWasEntered extends Schema.TaggedClass<CommentWasEntered>()('CommentWasEntered', {
  comment: HtmlSchema,
  commentId: Uuid.UuidSchema,
}) {}

export class PersonaForCommentWasChosen extends Schema.TaggedClass<PersonaForCommentWasChosen>()(
  'PersonaForCommentWasChosen',
  {
    persona: Schema.Literal('public', 'pseudonym'),
    commentId: Uuid.UuidSchema,
  },
) {}

export class CompetingInterestsForCommentWereDeclared extends Schema.TaggedClass<CompetingInterestsForCommentWereDeclared>()(
  'CompetingInterestsForCommentWereDeclared',
  { competingInterests: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema), commentId: Uuid.UuidSchema },
) {}

export class CodeOfConductForCommentWasAgreed extends Schema.TaggedClass<CodeOfConductForCommentWasAgreed>()(
  'CodeOfConductForCommentWasAgreed',
  { commentId: Uuid.UuidSchema },
) {}

export class ExistenceOfVerifiedEmailAddressForCommentWasConfirmed extends Schema.TaggedClass<ExistenceOfVerifiedEmailAddressForCommentWasConfirmed>()(
  'ExistenceOfVerifiedEmailAddressForCommentWasConfirmed',
  { commentId: Uuid.UuidSchema },
) {}

export class PublicationOfCommentWasRequested extends Schema.TaggedClass<PublicationOfCommentWasRequested>()(
  'PublicationOfCommentWasRequested',
  { commentId: Uuid.UuidSchema },
) {}

export class CommentWasAssignedADoi extends Schema.TaggedClass<CommentWasAssignedADoi>()('CommentWasAssignedADoi', {
  id: Schema.Number,
  doi: Doi.DoiSchema,
  commentId: Uuid.UuidSchema,
}) {}

export class CommentWasPublished extends Schema.TaggedClass<CommentWasPublished>()('CommentWasPublished', {
  commentId: Uuid.UuidSchema,
}) {}

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
