import { Temporal } from '@js-temporal/polyfill'
import { Option, Result } from 'effect'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import * as _ from '../../../../src/Domain/PreprintReviews/GetPublishedPreprintReview/Query.ts'
import {
  PrereviewIsNotFound,
  PrereviewIsUnavailable,
  PrereviewWasRemoved,
} from '../../../../src/Domain/PreprintReviews/index.ts'
import { BiorxivOrMedrxivPreprintId } from '../../../../src/Domain/Preprints/index.ts'
import { html } from '../../../../src/html.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Name } from '../../../../src/types/Name.ts'
import { NonEmptyString } from '../../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'
import { Uuid } from '../../../../src/types/Uuid.ts'
import { expect, test } from '../../../vitest.ts'

const input = 12345 satisfies _.Input

const prereview = {
  authors: {
    named: [{ persona: 'public', orcidId: OrcidId('0000-0002-1825-0097') }],
    anonymous: 1,
  },
  doi: Doi('10.5281/zenodo.12345'),
  id: input,
  language: 'en',
  license: 'CC-BY-4.0',
  live: false,
  preprintId: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/abcde') }),
  published: Temporal.Instant.from('2026-11-10T14:25:00Z'),
  content: { _tag: 'Full', text: html`<p>Hello</p>` },
  competingInterests: { _tag: 'No' },
  topics: ['11251', '12030'],
  useOfAi: { _tag: 'No' },
} satisfies _.PublishedPreprintReviewDetails

const reviewImported = new Events.PreprintReviewImported({
  authors: [
    {
      _tag: 'PublicPersona',
      name: Option.none(),
      orcidId: prereview.authors.named[0].orcidId,
    },
  ],
  otherAuthors: prereview.authors.anonymous,
  doi: prereview.doi,
  id: prereview.id,
  license: prereview.license,
  published: prereview.published,
  preprint: prereview.preprintId,
  live: prereview.live,
  useOfAi: prereview.useOfAi,
  competingInterests: prereview.competingInterests,
  language: prereview.language,
  content: prereview.content,
  topics: prereview.topics,
})

const reviewImportedWithPlainDate = new Events.PreprintReviewImported({
  ...reviewImported,
  published: Temporal.PlainDate.from('2026-11-10'),
})

const authorListChanged = new Events.AuthorChoicesForAReviewImported({
  reviewId: input,
  orcidId: OrcidId('0000-0002-6109-0367'),
  persona: 'public',
  confirmedAt: Temporal.Now.instant(),
})

const updatedAuthors = {
  named: [
    { persona: 'public', orcidId: OrcidId('0000-0002-1825-0097') },
    { persona: 'public', orcidId: OrcidId('0000-0002-6109-0367') },
  ],
  anonymous: 0,
} satisfies _.PublishedPreprintReviewDetails['authors']

const reviewWithUnknownAuthorImported = new Events.PreprintReviewImported({
  ...reviewImported,
  authors: [{ _tag: 'Unknown', name: Option.some(Name('Somebody who is not a PREreviewer')) }],
  otherAuthors: 0,
})

const reviewWithNamedAndUnknownAuthorsImported = new Events.PreprintReviewImported({
  ...reviewImported,
  authors: [...reviewImported.authors, ...reviewWithUnknownAuthorImported.authors],
  otherAuthors: 0,
})

const reviewWithDeclarationsImported = new Events.PreprintReviewImported({
  ...reviewImported,
  competingInterests: { _tag: 'Yes', comment: NonEmptyString('A competing interest') },
  useOfAi: { _tag: 'Yes', comment: Option.some(NonEmptyString('A use of AI')) },
})

const structuredQuestions = {
  introductionMatches: { answer: 'yes', comment: Option.none() },
  methodsAppropriate: { answer: 'highly-appropriate', comment: Option.none() },
  conclusionsSupported: { answer: 'highly-supported', comment: Option.none() },
  dataPresentation: { answer: 'highly-appropriate-and-clear', comment: Option.none() },
  findingsNextSteps: { answer: 'very-clearly', comment: Option.none() },
  advancingKnowledge: { answer: 'highly', comment: Option.none() },
  languageEditing: { answer: 'no', comment: Option.none() },
  wouldRecommend: { answer: 'yes', comment: Option.none() },
  readyForAttention: { answer: 'yes-as-is', comment: Option.none() },
} satisfies Extract<_.PublishedPreprintReviewDetails['content'], { _tag: 'Structured' }>['questions']

const structuredReviewImported = new Events.PreprintReviewImported({
  ...reviewImported,
  content: { _tag: 'Structured', ...structuredQuestions },
})

const reviewWithPseudonymImported = new Events.PreprintReviewImported({
  ...reviewImported,
  authors: [{ _tag: 'PseudonymPersona', orcidId: OrcidId('0000-0002-6109-0367') }],
  otherAuthors: 0,
})

const pseudonymChosen = new Events.AuthorChoicesForAReviewImported({
  ...authorListChanged,
  persona: 'pseudonym',
})

const clubId = Uuid('4f8076fc-2219-49fc-be5f-6682ca7cc009')

const otherClubId = Uuid('998f32b4-ced9-49f8-8042-ce8fe41e62ec')

const reviewImportedInAClub = new Events.PreprintReviewImported({ ...reviewImported, club: clubId })

const addedToAClub = new Events.PreprintReviewWasAddedToAClub({ preprintReviewId: input, clubId })

const addedToAnotherClub = new Events.PreprintReviewWasAddedToAClub({ preprintReviewId: input, clubId: otherClubId })

const otherReviewAddedToAClub = new Events.PreprintReviewWasAddedToAClub({ preprintReviewId: 67890, clubId })

test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.PublishedPreprintReviewDetails, _.Error>]>([
  ['no events', input, [], Result.fail(new PrereviewIsNotFound())],
  ['review imported', input, [reviewImported], Result.succeed(prereview)],
  [
    'review imported with plaindate',
    input,
    [reviewImportedWithPlainDate],
    Result.succeed({ ...prereview, published: reviewImportedWithPlainDate.published }),
  ],
  [
    'review imported with competing interests and use of AI',
    input,
    [reviewWithDeclarationsImported],
    Result.succeed({
      ...prereview,
      competingInterests: reviewWithDeclarationsImported.competingInterests,
      useOfAi: reviewWithDeclarationsImported.useOfAi,
    }),
  ],
  [
    'structured review imported',
    input,
    [structuredReviewImported],
    Result.succeed({ ...prereview, content: { _tag: 'Structured', questions: structuredQuestions } }),
  ],
  ['review imported in a club', input, [reviewImportedInAClub], Result.succeed({ ...prereview, clubId })],
  ['review added to a club', input, [reviewImported, addedToAClub], Result.succeed({ ...prereview, clubId })],
  [
    'review moved to another club',
    input,
    [reviewImportedInAClub, addedToAnotherClub],
    Result.succeed({ ...prereview, clubId: otherClubId }),
  ],
  ['another review added to a club', input, [reviewImported, otherReviewAddedToAClub], Result.succeed(prereview)],
  ['author list changed prior to import', input, [authorListChanged, reviewImported], Result.succeed(prereview)],
  [
    'author list changed after import',
    input,
    [reviewImported, authorListChanged],
    Result.succeed({ ...prereview, authors: updatedAuthors }),
  ],
  [
    'author list containing a named and an unknown author',
    input,
    [reviewWithNamedAndUnknownAuthorsImported],
    Result.succeed({ ...prereview, authors: { named: prereview.authors.named, anonymous: 1 } }),
  ],
  [
    'author list containing a pseudonym persona',
    input,
    [reviewWithPseudonymImported],
    Result.succeed({
      ...prereview,
      authors: { named: [{ orcidId: OrcidId('0000-0002-6109-0367'), persona: 'pseudonym' }], anonymous: 0 },
    }),
  ],
  [
    'author list changed to a pseudonym persona after import',
    input,
    [reviewImported, pseudonymChosen],
    Result.succeed({
      ...prereview,
      authors: {
        named: [...prereview.authors.named, { orcidId: OrcidId('0000-0002-6109-0367'), persona: 'pseudonym' }],
        anonymous: 0,
      },
    }),
  ],
  [
    'author list containing single unknown author',
    input,
    [reviewWithUnknownAuthorImported],
    Result.fail(new PrereviewIsUnavailable({ cause: 'no named authors' })),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.Query(() => false)

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

test('when the review was removed', () => {
  const { query } = _.Query(id => id === input)

  const actual = query([reviewImported], input)

  expect(actual).toStrictEqual(Result.fail(new PrereviewWasRemoved()))
})
