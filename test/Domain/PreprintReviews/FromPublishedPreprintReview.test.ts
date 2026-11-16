import { expect, test } from '../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as _ from '../../../src/Domain/PreprintReviews/FromPublishedPreprintReview.ts'
import { PublishedPreprintReview } from '../../../src/Domain/PreprintReviews/GetPublishedPreprintReview/index.ts'
import { Prereview } from '../../../src/Domain/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../../src/Domain/Preprints/index.ts'
import { PseudonymPersona, PublicPersona } from '../../../src/Domain/Prereviewers/index.ts'
import { html } from '../../../src/html.ts'
import { translate } from '../../../src/locales/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { Name } from '../../../src/types/Name.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'

const review = new PublishedPreprintReview({
  addendum: html`<p>An addendum</p>`,
  authors: {
    named: [
      new PublicPersona({ name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') }),
      new PseudonymPersona({ pseudonym: Pseudonym('Orange Panda') }),
    ],
    anonymous: 1,
  },
  competingInterests: { _tag: 'NotAnswered' },
  content: { _tag: 'Full', text: html`<p>Hello</p>` },
  doi: Doi('10.5281/zenodo.12345'),
  id: 12345,
  language: 'en',
  license: 'CC-BY-4.0',
  live: false,
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/abcde') }),
    language: 'en',
    title: html`A preprint`,
    url: new URL('https://www.biorxiv.org/content/10.1101/abcde'),
  },
  published: Temporal.PlainDate.from('2026-11-10'),
  requested: false,
  useOfAi: { _tag: 'NotAnswered' },
})

test('converts a full review', () => {
  const actual = _.fromPublishedPreprintReview(review)

  expect(actual).toStrictEqual(
    new Prereview({
      addendum: review.addendum,
      authors: {
        named: [
          { name: Name('Josiah Carberry'), orcid: OrcidId('0000-0002-1825-0097') },
          { name: Pseudonym('Orange Panda') },
        ],
        anonymous: 1,
      },
      club: undefined,
      doi: review.doi,
      id: review.id,
      language: review.language,
      license: review.license,
      live: review.live,
      preprint: review.preprint,
      published: review.published,
      requested: review.requested,
      structured: false,
      text: html`<p>Hello</p>`,
    }),
  )
})

const structuredReview = new PublishedPreprintReview({
  ...review,
  content: {
    _tag: 'Structured',
    questions: {
      introductionMatches: { answer: 'yes', comment: Option.some(NonEmptyString('A comment')) },
      methodsAppropriate: { answer: 'highly-appropriate', comment: Option.none() },
      conclusionsSupported: { answer: 'highly-supported', comment: Option.none() },
      dataPresentation: { answer: 'highly-appropriate-and-clear', comment: Option.none() },
      findingsNextSteps: { answer: 'very-clearly', comment: Option.none() },
      advancingKnowledge: { answer: 'highly', comment: Option.none() },
      languageEditing: { answer: 'no', comment: Option.none() },
      wouldRecommend: { answer: 'yes', comment: Option.none() },
      readyForAttention: { answer: 'yes-as-is', comment: Option.none() },
    },
  },
})

test('converts a structured review', () => {
  const actual = _.fromPublishedPreprintReview(structuredReview)

  expect(actual.structured).toBe(true)
  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'doesIntroductionExplain')())
  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'methodsHighlyAppropriate')())
  expect(actual.text.toString()).toContain('A comment')
})

test("uses the review's language for a structured review's labels", () => {
  const actual = _.fromPublishedPreprintReview(new PublishedPreprintReview({ ...structuredReview, language: 'pt' }))

  expect(actual.text.toString()).toContain(translate('pt-BR', 'write-review', 'doesIntroductionExplain')())
})

test("falls back to the default locale when a structured review's language isn't known", () => {
  const actual = _.fromPublishedPreprintReview(
    new PublishedPreprintReview({ ...structuredReview, language: undefined }),
  )

  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'doesIntroductionExplain')())
})

test('adds competing interests and use of AI', () => {
  const actual = _.fromPublishedPreprintReview(
    new PublishedPreprintReview({
      ...review,
      competingInterests: { _tag: 'Yes', comment: Option.some(NonEmptyString('A competing interest')) },
      useOfAi: { _tag: 'Yes', comment: Option.some(NonEmptyString('A use of AI')) },
    }),
  )

  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'competingInterests')())
  expect(actual.text.toString()).toContain('A competing interest')
  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'useOfAi')())
  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'aiIdeasAuthorsStatement')())
  expect(actual.text.toString()).toContain('A use of AI')
})

test('says when there are no competing interests or use of AI for several authors', () => {
  const actual = _.fromPublishedPreprintReview(
    new PublishedPreprintReview({ ...review, competingInterests: { _tag: 'No' }, useOfAi: { _tag: 'No' } }),
  )

  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'competingInterestsAuthorsNo')())
  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'noAiIdeasAuthorsStatement')())
})

test('says when there are no competing interests or use of AI for a single author', () => {
  const actual = _.fromPublishedPreprintReview(
    new PublishedPreprintReview({
      ...review,
      authors: { named: [review.authors.named[0]], anonymous: 0 },
      competingInterests: { _tag: 'No' },
      useOfAi: { _tag: 'No' },
    }),
  )

  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'competingInterestsNo')())
  expect(actual.text.toString()).toContain(translate('en-US', 'write-review', 'noAiIdeasStatement')())
})
