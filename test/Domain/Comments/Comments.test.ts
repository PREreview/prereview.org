import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as _ from '../../../src/Domain/Comments/index.ts'
import * as Events from '../../../src/Domain/Events/Events.ts'
import { html } from '../../../src/html.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { CommandHandlerSpecification } from '../../CommandHandlerSpecification.ts'
import { describe, test } from '../../vitest.ts'

const given = CommandHandlerSpecification.for({
  decide: _.DecideComment,
  evolve: _.EvolveComment,
  initialState: new _.CommentNotStarted(),
})

const commentId = Uuid.Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8')
const publishedAt = Temporal.Instant.from('2026-11-18T12:00:00Z')

describe('when not started', () => {
  test('can be started', () =>
    given()
      .when(new _.StartComment({ commentId, prereviewId: 89935, authorId: OrcidId('0000-0002-1825-0097') }))
      .then(new Events.CommentWasStarted({ commentId, prereviewId: 89935, authorId: OrcidId('0000-0002-1825-0097') })))

  test('cannot enter the comment', () =>
    given()
      .when(new _.EnterComment({ commentId, comment: html`<p>Some comment.</p>` }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot choose persona', () =>
    given()
      .when(new _.ChoosePersona({ commentId, persona: 'public' }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot declare competing interests', () =>
    given()
      .when(new _.DeclareCompetingInterests({ commentId, competingInterests: Option.none() }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot agree to the code of conduct', () =>
    given().when(new _.AgreeToCodeOfConduct({ commentId })).thenError(new _.CommentHasNotBeenStarted()))

  test('cannot confirm the existence of a verified email address', () =>
    given()
      .when(new _.ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot request publication', () =>
    given().when(new _.PublishComment({ commentId })).thenError(new _.CommentHasNotBeenStarted()))

  test('cannot request publication', () =>
    given().when(new _.PublishComment({ commentId })).thenError(new _.CommentHasNotBeenStarted()))

  test('DOI cannot be marked as assigned', () =>
    given()
      .when(new _.MarkDoiAsAssigned({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot be marked as published', () =>
    given().when(new _.MarkCommentAsPublished({ commentId, publishedAt })).thenError(new _.CommentHasNotBeenStarted()))
})

describe('when in progress', () => {
  const started = new Events.CommentWasStarted({
    commentId,
    prereviewId: 123,
    authorId: OrcidId('0000-0002-1825-0097'),
  })
  test('cannot be started again', () =>
    given(started)
      .when(new _.StartComment({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }))
      .thenError(new _.CommentWasAlreadyStarted()))

  test('can enter the comment', () =>
    given(started)
      .when(new _.EnterComment({ commentId, comment: html`<p>Some comment.</p>` }))
      .then(new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` })))

  test('can choose persona', () =>
    given(started)
      .when(new _.ChoosePersona({ commentId, persona: 'pseudonym' }))
      .then(new Events.PersonaForCommentWasChosen({ commentId, persona: 'pseudonym' })))

  test('can declare competing interests', () =>
    given(started)
      .when(new _.DeclareCompetingInterests({ commentId, competingInterests: Option.none() }))
      .then(new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() })))

  test('can agree to the code of conduct', () =>
    given(started)
      .when(new _.AgreeToCodeOfConduct({ commentId }))
      .then(new Events.CodeOfConductForCommentWasAgreed({ commentId })))

  test('re-agreeing to the code of conduct does nothing', () =>
    given(started, new Events.CodeOfConductForCommentWasAgreed({ commentId }))
      .when(new _.AgreeToCodeOfConduct({ commentId }))
      .thenNothing())

  test('can confirm the existence of a verified email address', () =>
    given(started)
      .when(new _.ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
      .then(new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId })))

  test('re-confirming the existence of a verified email address does nothing', () =>
    given(started, new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }))
      .when(new _.ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
      .thenNothing())

  test('cannot request publication', () =>
    given(started).when(new _.PublishComment({ commentId })).thenError(new _.CommentIsIncomplete()))

  test('cannot request publication', () =>
    given(
      started,
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    )
      .when(new _.PublishComment({ commentId }))
      .thenError(new _.CommentIsIncomplete()))

  test('DOI cannot be marked as assigned', () =>
    given(started)
      .when(new _.MarkDoiAsAssigned({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.CommentIsIncomplete()))

  test('cannot be marked as published', () =>
    given(started)
      .when(new _.MarkCommentAsPublished({ commentId, publishedAt }))
      .thenError(new _.CommentIsIncomplete()))
})

describe('when ready for publication', () => {
  const minimumEventsToBeReady = [
    new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
    new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
    new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
    new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
    new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
  ]

  test('cannot be started again', () =>
    given(...minimumEventsToBeReady)
      .when(new _.StartComment({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }))
      .thenError(new _.CommentWasAlreadyStarted()))

  test('can re-enter the comment', () =>
    given(...minimumEventsToBeReady)
      .when(new _.EnterComment({ commentId, comment: html`<p>Some different comment.</p>` }))
      .then(new Events.CommentWasEntered({ commentId, comment: html`<p>Some different comment.</p>` })))

  test('can choose persona', () =>
    given(...minimumEventsToBeReady)
      .when(new _.ChoosePersona({ commentId, persona: 'pseudonym' }))
      .then(new Events.PersonaForCommentWasChosen({ commentId, persona: 'pseudonym' })))

  test('can re-declare competing interests', () =>
    given(...minimumEventsToBeReady)
      .when(
        new _.DeclareCompetingInterests({
          commentId,
          competingInterests: NonEmptyString.fromString('Some competing interests.'),
        }),
      )
      .then(
        new Events.CompetingInterestsForCommentWereDeclared({
          commentId,
          competingInterests: NonEmptyString.fromString('Some competing interests.'),
        }),
      ))

  test('agreeing to the code of conduct does nothing', () =>
    given(...minimumEventsToBeReady)
      .when(new _.AgreeToCodeOfConduct({ commentId }))
      .thenNothing())

  test('re-confirming the existence of a verified email address does nothing', () =>
    given(...minimumEventsToBeReady)
      .when(new _.ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
      .thenNothing())

  test('can request publication', () =>
    given(...minimumEventsToBeReady)
      .when(new _.PublishComment({ commentId }))
      .then(new Events.PublicationOfCommentWasRequested({ commentId })))

  test('DOI can be marked as assigned', () =>
    given(...minimumEventsToBeReady)
      .when(new _.MarkDoiAsAssigned({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .then(new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') })))

  test('cannot be marked as published', () =>
    given(...minimumEventsToBeReady)
      .when(new _.MarkCommentAsPublished({ commentId, publishedAt }))
      .thenError(new _.DoiIsNotAssigned()))
})

describe('when being published', () => {
  test('cannot be started again', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.StartComment({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot re-enter the comment', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.EnterComment({ commentId, comment: html`<p>Some different comment.</p>` }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot choose a new persona', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.ChoosePersona({ commentId, persona: 'pseudonym' }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot declare competing interests', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.DeclareCompetingInterests({ commentId, competingInterests: Option.none() }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot agree to the code of conduct', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.AgreeToCodeOfConduct({ commentId }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot confirm the existence of a verified email address', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
      .thenError(new _.CommentIsBeingPublished()))

  test('re-requesting publication does nothing', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.PublicationOfCommentWasRequested({ commentId }),
    )
      .when(new _.PublishComment({ commentId }))
      .thenNothing())

  describe("when a DOI hasn't been assigned", () => {
    test('DOI can be marked as assigned', () =>
      given(
        new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
        new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
        new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
        new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
        new Events.CodeOfConductForCommentWasAgreed({ commentId }),
        new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
        new Events.PublicationOfCommentWasRequested({ commentId }),
      )
        .when(new _.MarkDoiAsAssigned({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }))
        .then(new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') })))

    test('cannot be marked as published', () =>
      given(
        new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
        new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
        new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
        new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
        new Events.CodeOfConductForCommentWasAgreed({ commentId }),
        new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
        new Events.PublicationOfCommentWasRequested({ commentId }),
      )
        .when(new _.MarkCommentAsPublished({ commentId, publishedAt }))
        .thenError(new _.DoiIsNotAssigned()))
  })

  describe('when a DOI has been assigned', () => {
    test('DOI cannot be re-assigned', () =>
      given(
        new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
        new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
        new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
        new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
        new Events.CodeOfConductForCommentWasAgreed({ commentId }),
        new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
        new Events.PublicationOfCommentWasRequested({ commentId }),
        new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      )
        .when(new _.MarkDoiAsAssigned({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }))
        .thenError(new _.DoiIsAlreadyAssigned()))

    test('can be marked as published', () =>
      given(
        new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
        new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
        new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
        new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
        new Events.CodeOfConductForCommentWasAgreed({ commentId }),
        new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
        new Events.PublicationOfCommentWasRequested({ commentId }),
        new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      )
        .when(new _.MarkCommentAsPublished({ commentId, publishedAt }))
        .then(new Events.CommentWasPublished({ commentId, publishedAt })))
  })
})

describe('when published', () => {
  test('is still published once its publication date is imported', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
      new Events.PublicationDateForCommentWasImported({ commentId, publishedAt }),
    )
      .when(new _.MarkCommentAsPublished({ commentId, publishedAt }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('is still published once withdrawn', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId, publishedAt }),
      new Events.CommentWasWithdrawn({ commentId, withdrawnAt: publishedAt.add({ hours: 1 }), reason: 'spam' }),
    )
      .when(new _.EnterComment({ commentId, comment: html`<p>Some different comment.</p>` }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot be started again', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.StartComment({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot re-enter the comment', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.EnterComment({ commentId, comment: html`<p>Some different comment.</p>` }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot choose a new persona', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.ChoosePersona({ commentId, persona: 'pseudonym' }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot declare competing interests', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.DeclareCompetingInterests({ commentId, competingInterests: Option.none() }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot re-agree to the code of conduct', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.AgreeToCodeOfConduct({ commentId }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot confirm the existence of a verified email address', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot be re-request publication', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.PublishComment({ commentId }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('DOI cannot be re-assigned', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.MarkDoiAsAssigned({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot be re-marked as published', () =>
    given(
      new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId: OrcidId('0000-0002-1825-0097') }),
      new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` }),
      new Events.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
      new Events.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new Events.CommentWasPublished({ commentId }),
    )
      .when(new _.MarkCommentAsPublished({ commentId, publishedAt }))
      .thenError(new _.CommentWasAlreadyPublished()))
})
