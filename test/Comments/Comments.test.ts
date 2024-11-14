import { describe, test } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../../src/Comments/index.js'
import { html } from '../../src/html.js'
import type { NonEmptyString } from '../../src/types/index.js'
import { CommandHandlerSpecification } from '../CommandHandlerSpecification.js'

describe('when not started', () => {
  test('can be started', () =>
    given()
      .when(new _.StartComment({ prereviewId: 89935, authorId: Orcid('0000-0002-1825-0097') }))
      .then(new _.CommentWasStarted({ prereviewId: 89935, authorId: Orcid('0000-0002-1825-0097') })))

  test('cannot enter the comment', () =>
    given()
      .when(new _.EnterComment({ comment: html`<p>Some comment.</p>` }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot choose persona', () =>
    given()
      .when(new _.ChoosePersona({ persona: 'public' }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot declare competing interests', () =>
    given()
      .when(new _.DeclareCompetingInterests({ competingInterests: Option.none() }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot agree to the code of conduct', () =>
    given().when(new _.AgreeToCodeOfConduct()).thenError(new _.CommentHasNotBeenStarted()))

  test('cannot request publication', () =>
    given().when(new _.PublishComment()).thenError(new _.CommentHasNotBeenStarted()))

  test('cannot request publication', () =>
    given().when(new _.PublishComment()).thenError(new _.CommentHasNotBeenStarted()))

  test('DOI cannot be marked as assigned', () =>
    given()
      .when(new _.MarkDoiAsAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot be marked as published', () =>
    given().when(new _.MarkCommentAsPublished()).thenError(new _.CommentHasNotBeenStarted()))
})

describe('when in progress', () => {
  test('cannot be started again', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.StartComment({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.CommentWasAlreadyStarted()))

  test('can enter the comment', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.EnterComment({ comment: html`<p>Some comment.</p>` }))
      .then(new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` })))

  test('can choose persona', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .then(new _.PersonaWasChosen({ persona: 'pseudonym' })))

  test('can declare competing interests', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.DeclareCompetingInterests({ competingInterests: Option.none() }))
      .then(new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() })))

  test('can agree to the code of conduct', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.AgreeToCodeOfConduct())
      .then(new _.CodeOfConductWasAgreed()))

  test('re-agreeing to the code of conduct does nothing', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.AgreeToCodeOfConduct())
      .then())

  test('cannot request publication', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.PublishComment())
      .thenError(new _.CommentIsIncomplete()))

  test('DOI cannot be marked as assigned', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.MarkDoiAsAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.CommentHasNotBeenStarted()))

  test('cannot be marked as published', () =>
    given(new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.MarkCommentAsPublished())
      .thenError(new _.CommentIsIncomplete()))
})

describe('when ready for publication', () => {
  const minimumEventsToBeReady = [
    new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
    new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
    new _.PersonaWasChosen({ persona: 'public' }),
    new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
    new _.CodeOfConductWasAgreed(),
  ]

  test('cannot be started again', () =>
    given(...minimumEventsToBeReady)
      .when(new _.StartComment({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.CommentWasAlreadyStarted()))

  test('can re-enter the comment', () =>
    given(...minimumEventsToBeReady)
      .when(new _.EnterComment({ comment: html`<p>Some different comment.</p>` }))
      .then(new _.CommentWasEntered({ comment: html`<p>Some different comment.</p>` })))

  test('can choose persona', () =>
    given(...minimumEventsToBeReady)
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .then(new _.PersonaWasChosen({ persona: 'pseudonym' })))

  test('can re-declare competing interests', () =>
    given(...minimumEventsToBeReady)
      .when(
        new _.DeclareCompetingInterests({
          competingInterests: Option.some('Some competing interests.' as NonEmptyString.NonEmptyString),
        }),
      )
      .then(
        new _.CompetingInterestsWereDeclared({
          competingInterests: Option.some('Some competing interests.' as NonEmptyString.NonEmptyString),
        }),
      ))

  test('agreeing to the code of conduct does nothing', () =>
    given(...minimumEventsToBeReady)
      .when(new _.AgreeToCodeOfConduct())
      .then())

  test('can request publication', () =>
    given(...minimumEventsToBeReady)
      .when(new _.PublishComment())
      .then(new _.CommentPublicationWasRequested()))

  test('DOI can be marked as assigned', () =>
    given(...minimumEventsToBeReady)
      .when(new _.MarkDoiAsAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .then(new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') })))

  test('cannot be marked as published', () =>
    given(...minimumEventsToBeReady)
      .when(new _.MarkCommentAsPublished())
      .thenError(new _.DoiIsNotAssigned()))
})

describe('when being published', () => {
  test('cannot be started again', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.CommentPublicationWasRequested(),
    )
      .when(new _.StartComment({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot re-enter the comment', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.CommentPublicationWasRequested(),
    )
      .when(new _.EnterComment({ comment: html`<p>Some different comment.</p>` }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot choose a new persona', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.CommentPublicationWasRequested(),
    )
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot declare competing interests', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.CommentPublicationWasRequested(),
    )
      .when(new _.DeclareCompetingInterests({ competingInterests: Option.none() }))
      .thenError(new _.CommentIsBeingPublished()))

  test('cannot agree to the code of conduct', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.CommentPublicationWasRequested(),
    )
      .when(new _.AgreeToCodeOfConduct())
      .thenError(new _.CommentIsBeingPublished()))

  test('re-requesting publication does nothing', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.CommentPublicationWasRequested(),
    )
      .when(new _.PublishComment())
      .then())

  describe("when a DOI hasn't been assigned", () => {
    test('DOI can be marked as assigned', () =>
      given(
        new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
        new _.PersonaWasChosen({ persona: 'public' }),
        new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
        new _.CodeOfConductWasAgreed(),
        new _.CommentPublicationWasRequested(),
      )
        .when(new _.MarkDoiAsAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
        .then(new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') })))

    test('cannot be marked as published', () =>
      given(
        new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
        new _.PersonaWasChosen({ persona: 'public' }),
        new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
        new _.CodeOfConductWasAgreed(),
        new _.CommentPublicationWasRequested(),
      )
        .when(new _.MarkCommentAsPublished())
        .thenError(new _.DoiIsNotAssigned()))
  })

  describe('when a DOI has been assigned', () => {
    test('DOI cannot be re-assigned', () =>
      given(
        new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
        new _.PersonaWasChosen({ persona: 'public' }),
        new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
        new _.CodeOfConductWasAgreed(),
        new _.CommentPublicationWasRequested(),
        new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      )
        .when(new _.MarkDoiAsAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
        .thenError(new _.DoiIsAlreadyAssigned()))

    test('can be marked as published', () =>
      given(
        new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
        new _.PersonaWasChosen({ persona: 'public' }),
        new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
        new _.CodeOfConductWasAgreed(),
        new _.CommentPublicationWasRequested(),
        new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      )
        .when(new _.MarkCommentAsPublished())
        .then(new _.CommentWasPublished()))
  })
})

describe('when published', () => {
  test('cannot be started again', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.StartComment({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot re-enter the comment', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.EnterComment({ comment: html`<p>Some different comment.</p>` }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot choose a new persona', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot declare competing interests', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.DeclareCompetingInterests({ competingInterests: Option.none() }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot re-agree to the code of conduct', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.AgreeToCodeOfConduct())
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot be re-request publication', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.PublishComment())
      .thenError(new _.CommentWasAlreadyPublished()))

  test('DOI cannot be re-assigned', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.MarkDoiAsAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.CommentWasAlreadyPublished()))

  test('cannot be re-marked as published', () =>
    given(
      new _.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CommentWasEntered({ comment: html`<p>Some comment.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
      new _.CodeOfConductWasAgreed(),
      new _.DoiWasAssigned({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
      new _.CommentWasPublished(),
    )
      .when(new _.MarkCommentAsPublished())
      .thenError(new _.CommentWasAlreadyPublished()))
})

const given = CommandHandlerSpecification.for({
  decide: _.DecideComment,
  evolve: _.EvolveComment(false),
  initialState: new _.CommentNotStarted(),
})
