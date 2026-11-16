import { Array, Match, Option } from 'effect'
import { type Html, html } from '../../html.ts'
import {
  DefaultLocale,
  getLocaleForLanguage,
  isUserSelectableLanguage,
  type SupportedLocale,
  translate,
} from '../../locales/index.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { matchPersona } from '../Prereviewers/index.ts'
import type { PublishedPreprintReview } from './GetPublishedPreprintReview/index.ts'
import { Prereview } from './Prereview.ts'

type StructuredQuestions = Extract<PublishedPreprintReview['content'], { _tag: 'Structured' }>['questions']

export const fromPublishedPreprintReview = (review: PublishedPreprintReview): Prereview => {
  const locale =
    review.language !== undefined && isUserSelectableLanguage(review.language)
      ? getLocaleForLanguage(review.language)
      : DefaultLocale

  return new Prereview({
    addendum: review.addendum,
    authors: {
      named: Array.map(
        review.authors.named,
        matchPersona({
          onPublic: persona => ({ name: persona.displayName, orcid: persona.orcidId }),
          onPseudonym: persona => ({ name: persona.pseudonym }),
        }),
      ),
      anonymous: review.authors.anonymous,
    },
    club: review.club,
    doi: review.doi,
    id: review.id,
    language: review.language,
    license: review.license,
    published: review.published,
    preprint: review.preprint,
    live: review.live,
    requested: review.requested,
    ...Match.valueTags(review.content, {
      Full: ({ text }) => ({ structured: false, text }),
      Structured: ({ questions }) => ({ structured: true, text: renderStructuredQuestions(questions, locale) }),
    }),
  })
}

const renderStructuredQuestions = (questions: StructuredQuestions, locale: SupportedLocale) => {
  const t = translate(locale, 'write-review')

  return html`<dl>
    ${renderQuestion(
      t('doesIntroductionExplain')(),
      { yes: t('yes'), partly: t('partly'), no: t('no'), skip: t('iDoNotKnow') }[
        questions.introductionMatches.answer
      ](),
      questions.introductionMatches.comment,
    )}
    ${renderQuestion(
      t('methodsWellSuited')(),
      {
        'highly-inappropriate': t('methodsHighlyInappropriate'),
        'somewhat-inappropriate': t('methodsSomewhatInappropriate'),
        neither: t('methodsNeitherAppropriateNorInappropriate'),
        'somewhat-appropriate': t('methodsSomewhatAppropriate'),
        'highly-appropriate': t('methodsHighlyAppropriate'),
        skip: t('iDoNotKnow'),
      }[questions.methodsAppropriate.answer](),
      questions.methodsAppropriate.comment,
    )}
    ${renderQuestion(
      t('conclusionsSupported')(),
      {
        'highly-unsupported': t('conclusionsHighlyUnsupported'),
        'somewhat-unsupported': t('conclusionsSomewhatUnsupported'),
        neither: t('conclusionsNeitherSupportedNorUnsupported'),
        'somewhat-supported': t('conclusionsSomewhatSupported'),
        'highly-supported': t('conclusionsHighlySupported'),
        skip: t('iDoNotKnow'),
      }[questions.conclusionsSupported.answer](),
      questions.conclusionsSupported.comment,
    )}
    ${renderQuestion(
      t('dataPresentationWellSuited')(),
      {
        'highly-inappropriate-or-unclear': t('highlyInappropriate'),
        'somewhat-inappropriate-or-unclear': t('somewhatInappropriate'),
        neither: t('neitherAppropriateOrClear'),
        'somewhat-appropriate-and-clear': t('somewhatAppropriate'),
        'highly-appropriate-and-clear': t('highlyAppropriateAndClear'),
        skip: t('iDoNotKnow'),
      }[questions.dataPresentation.answer](),
      questions.dataPresentation.comment,
    )}
    ${renderQuestion(
      t('clearDiscussion')(),
      {
        'very-unclearly': t('veryUnclearly'),
        'somewhat-unclearly': t('somewhatUnclearly'),
        neither: t('neitherClearlyNorUnclearly'),
        'somewhat-clearly': t('somewhatClearly'),
        'very-clearly': t('veryClearly'),
        skip: t('iDoNotKnow'),
      }[questions.findingsNextSteps.answer](),
      questions.findingsNextSteps.comment,
    )}
    ${renderQuestion(
      t('advanceKnowledge')(),
      {
        'not-at-all': t('advanceKnowledgeNotAtAllLikely'),
        not: t('advanceKnowledgeNotLikely'),
        moderately: t('advanceKnowledgeModeratelyLikely'),
        somewhat: t('advanceKnowledgeSomewhatLikely'),
        highly: t('advanceKnowledgeHighlyLikely'),
        skip: t('iDoNotKnow'),
      }[questions.advancingKnowledge.answer](),
      questions.advancingKnowledge.comment,
    )}
    ${renderQuestion(
      t('benefitFromEditing')(),
      { no: t('no'), yes: t('yes') }[questions.languageEditing.answer](),
      questions.languageEditing.comment,
    )}
    ${renderQuestion(
      t('wouldRecommend')(),
      {
        no: t('wouldRecommendNo'),
        'yes-but': t('wouldRecommendYesImproved'),
        yes: t('wouldRecommendYes'),
      }[questions.wouldRecommend.answer](),
      questions.wouldRecommend.comment,
    )}
    ${renderQuestion(
      t('readyForAttention')(),
      {
        'no-need-major-revision': t('readyForAttentionNo'),
        'yes-needs-minor-changes': t('readyForAttentionMinorChanges'),
        'yes-as-is': t('readyForAttentionYes'),
      }[questions.readyForAttention.answer](),
      questions.readyForAttention.comment,
    )}
  </dl>`
}

const renderQuestion = (question: Html, answer: Html, comment: Option.Option<NonEmptyString>) =>
  html`<dt>${question}</dt>
    <dd>${answer}</dd>
    ${Option.match(comment, { onNone: () => '', onSome: comment => html`<dd>${comment}</dd>` })}`
