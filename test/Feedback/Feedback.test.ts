import { describe, test } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../../src/Feedback/index.js'
import { html } from '../../src/html.js'
import { CommandHandlerSpecification } from '../CommandHandlerSpecification.js'

describe('when not started', () => {
  test('can be started', () =>
    given()
      .when(new _.StartFeedback({ prereviewId: 89935, authorId: Orcid('0000-0002-1825-0097') }))
      .then(new _.FeedbackWasStarted({ prereviewId: 89935, authorId: Orcid('0000-0002-1825-0097') })))

  test('cannot enter feedback', () =>
    given()
      .when(new _.EnterFeedback({ feedback: html`<p>Some feedback.</p>` }))
      .thenError(new _.FeedbackHasNotBeenStarted()))

  test('cannot choose persona', () =>
    given()
      .when(new _.ChoosePersona({ persona: 'public' }))
      .thenError(new _.FeedbackHasNotBeenStarted()))

  test('cannot agree to the code of conduct', () =>
    given().when(new _.AgreeToCodeOfConduct()).thenError(new _.FeedbackHasNotBeenStarted()))

  test('cannot request publication', () =>
    given().when(new _.PublishFeedback()).thenError(new _.FeedbackHasNotBeenStarted()))

  test('cannot request publication', () =>
    given().when(new _.PublishFeedback()).thenError(new _.FeedbackHasNotBeenStarted()))

  test('cannot be marked as published', () =>
    given()
      .when(new _.MarkFeedbackAsPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.FeedbackHasNotBeenStarted()))
})

describe('when in progress', () => {
  test('cannot be started again', () =>
    given(new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.StartFeedback({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.FeedbackWasAlreadyStarted()))

  test('can enter feedback', () =>
    given(new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.EnterFeedback({ feedback: html`<p>Some feedback.</p>` }))
      .then(new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` })))

  test('can choose persona', () =>
    given(new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .then(new _.PersonaWasChosen({ persona: 'pseudonym' })))

  test('can agree to the code of conduct', () =>
    given(new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.AgreeToCodeOfConduct())
      .then(new _.CodeOfConductWasAgreed()))

  test('re-agreeing to the code of conduct does nothing', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.AgreeToCodeOfConduct())
      .then())

  test('cannot request publication', () =>
    given(new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.PublishFeedback())
      .thenError(new _.FeedbackIsIncomplete()))

  test('cannot be marked as published', () =>
    given(new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .when(new _.MarkFeedbackAsPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.FeedbackIsIncomplete()))
})

describe('when ready for publication', () => {
  test('cannot be started again', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.StartFeedback({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.FeedbackWasAlreadyStarted()))

  test('can re-enter feedback', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.EnterFeedback({ feedback: html`<p>Some different feedback.</p>` }))
      .then(new _.FeedbackWasEntered({ feedback: html`<p>Some different feedback.</p>` })))

  test('can choose persona', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .then(new _.PersonaWasChosen({ persona: 'pseudonym' })))

  test('agreeing to the code of conduct does nothing', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.AgreeToCodeOfConduct())
      .then())

  test('can request publication', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.PublishFeedback())
      .then(new _.FeedbackPublicationWasRequested()))

  test('can be marked as published', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
    )
      .when(new _.MarkFeedbackAsPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .then(new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') })))
})

describe('when being published', () => {
  test('cannot be started again', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackPublicationWasRequested(),
    )
      .when(new _.StartFeedback({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.FeedbackIsBeingPublished()))

  test('cannot re-enter feedback', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackPublicationWasRequested(),
    )
      .when(new _.EnterFeedback({ feedback: html`<p>Some different feedback.</p>` }))
      .thenError(new _.FeedbackIsBeingPublished()))

  test('cannot choose a new persona', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackPublicationWasRequested(),
    )
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .thenError(new _.FeedbackIsBeingPublished()))

  test('cannot agree to the code of conduct', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackPublicationWasRequested(),
    )
      .when(new _.AgreeToCodeOfConduct())
      .thenError(new _.FeedbackIsBeingPublished()))

  test('re-requesting publication does nothing', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackPublicationWasRequested(),
    )
      .when(new _.PublishFeedback())
      .then())

  test('can be marked as published', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackPublicationWasRequested(),
    )
      .when(new _.MarkFeedbackAsPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .then(new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') })))
})

describe('when published', () => {
  test('cannot be started again', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
    )
      .when(new _.StartFeedback({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }))
      .thenError(new _.FeedbackWasAlreadyPublished()))

  test('cannot re-enter feedback', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
    )
      .when(new _.EnterFeedback({ feedback: html`<p>Some different feedback.</p>` }))
      .thenError(new _.FeedbackWasAlreadyPublished()))

  test('cannot choose a new persona', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
    )
      .when(new _.ChoosePersona({ persona: 'pseudonym' }))
      .thenError(new _.FeedbackWasAlreadyPublished()))

  test('cannot re-agree to the code of conduct', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
    )
      .when(new _.AgreeToCodeOfConduct())
      .thenError(new _.FeedbackWasAlreadyPublished()))

  test('cannot be re-request publication', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
    )
      .when(new _.PublishFeedback())
      .thenError(new _.FeedbackWasAlreadyPublished()))

  test('cannot be re-marked as published', () =>
    given(
      new _.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
      new _.FeedbackWasEntered({ feedback: html`<p>Some feedback.</p>` }),
      new _.PersonaWasChosen({ persona: 'public' }),
      new _.CodeOfConductWasAgreed(),
      new _.FeedbackWasPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }),
    )
      .when(new _.MarkFeedbackAsPublished({ id: 107286, doi: Doi('10.5072/zenodo.107286') }))
      .thenError(new _.FeedbackWasAlreadyPublished()))
})

const given = CommandHandlerSpecification.for({
  decide: _.DecideFeedback,
  evolve: _.EvolveFeedback,
  initialState: new _.FeedbackNotStarted(),
})
