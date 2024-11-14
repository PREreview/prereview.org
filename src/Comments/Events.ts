import { isDoi, type Doi } from 'doi-ts'
import { pipe, Schema } from 'effect'
import { isOrcid, type Orcid } from 'orcid-id-ts'
import { rawHtml, type Html } from '../html.js'
import { NonEmptyString } from '../types/index.js'

const DoiSchema: Schema.Schema<Doi, string> = pipe(Schema.String, Schema.filter(isDoi))

const OrcidSchema: Schema.Schema<Orcid, string> = pipe(Schema.String, Schema.filter(isOrcid))

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.Object, {
  strict: true,
  decode: rawHtml,
  encode: String,
}) as Schema.Schema<Html, string>

export class CommentWasStarted extends Schema.TaggedClass<CommentWasStarted>()('CommentWasStarted', {
  prereviewId: Schema.Number,
  authorId: OrcidSchema,
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
  doi: DoiSchema,
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
