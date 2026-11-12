import { expect, test } from '../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Option, Result } from 'effect'
import * as _ from '../../src/Prereviews/GetPublishedPreprintReview.ts'
import * as Events from '../../src/Events.ts'
import { PrereviewIsNotFound } from '../../src/Prereviews/index.ts'
import { BiorxivOrMedrxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { html } from '../../src/html.ts'

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
  published: Temporal.PlainDate.from('2026-11-10'),
  requested: false,
  structured: false,
  text: html`<p>Hello</p>`,
} satisfies _.Result

const reviewImported = new Events.PreprintReviewImported({
  authors: [
    {
      _tag: 'PublicPersona',
      name: Option.none(),
      // oxlint-disable-next-line typescript/no-non-null-assertion
      orcidId: prereview.authors.named[0]!.orcidId,
    },
  ],
  otherAuthors: prereview.authors.anonymous,
  doi: prereview.doi,
  id: prereview.id,
  license: prereview.license,
  published: prereview.published.toZonedDateTime({ timeZone: 'UTC', plainTime: '14:25' }).toInstant(),
  preprint: prereview.preprintId,
  live: prereview.live,
  useOfAi: { _tag: 'No' },
  competingInterests: { _tag: 'No' },
  language: prereview.language,
  content: { _tag: 'FreeText', text: prereview.text },
})

const reviewImportedWithPlainDate = new Events.PreprintReviewImported({
  ...reviewImported,
  published: prereview.published,
})

const authorListChanged = new Events.AuthorChoicesForAReviewImported({
  reviewId: input,
  orcidId: OrcidId('0000-0002-6109-0367'),
  persona: 'public',
  confirmedAt: Temporal.Now.instant(),
})

const updatedAuthors = {
  named: [
    { persona: 'public' as const, orcidId: OrcidId('0000-0002-1825-0097') },
    { persona: 'public' as const, orcidId: OrcidId('0000-0002-6109-0367') },
  ],
  anonymous: 0,
}

const reviewWithUnknownAuthorImported = new Events.PreprintReviewImported({
  ...reviewImported,
  authors: [{ _tag: 'Unknown', name: Option.some(Name('Somebody who is not a PREreviewer')) }],
  otherAuthors: 0,
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.Result, _.Error>]>([
  ['no events', input, [], Result.fail(new PrereviewIsNotFound())],
  ['review imported', input, [reviewImported], Result.succeed(prereview)],
  ['review imported with plaindate', input, [reviewImportedWithPlainDate], Result.succeed(prereview)],
  ['author list changed prior to import', input, [authorListChanged, reviewImported], Result.succeed(prereview)],
  [
    'author list changed after import',
    input,
    [reviewImported, authorListChanged],
    Result.succeed({ ...prereview, authors: updatedAuthors }),
  ],
  [
    'author list containing single unknown author',
    input,
    [reviewWithUnknownAuthorImported],
    Result.succeed({ ...prereview, authors: { named: [], anonymous: 1 } }),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetPublishedPreprintReview([])

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

/*
test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.Result, _.Error>]>([
  [
    'author list contains pseudonym persona',
    input,
    [prereviewerRegistered, reviewWithPseudonymImported],
    Result.succeed({ ...prereview, authors: withPseudonymAuthor }),
  ],
  [
    'author list contains pseudonym persona (imported pseudonym)',
    input,
    [prereviewerImported, reviewWithPseudonymImported],
    Result.succeed({ ...prereview, authors: withPseudonymAuthor }),
  ],
  [
    'author list contains pseudonym persona (pseudonym replaced)',
    input,
    [prereviewerImported, pseudonymReplaced, reviewWithPseudonymImported],
    Result.succeed({ ...prereview, authors: withReplacedPseudonymAuthor }),
  ],
  [
    "can't resolve pseudonym from events",
    input,
    [reviewWithPseudonymImported],
    Result.fail(new UnexpectedSequenceOfEvents()),
  ],
])
('%s', (_name, input, events, expected) => {
  const { query } = _.GetPublishedPreprintReview([])

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
*/

/*
const reviewRequestId = Uuid('f15c2fe6-6021-4c3b-8016-6b4af761263b')

const requested =[
  new Events.ReviewRequestForAPreprintWasReceived({preprintId: prereview.preprintId, reviewRequestId, requester: Option.none(), receivedFrom: new URL('http://example.com'), receivedAt: Temporal.Now.instant() }),
  new Events.ReviewRequestForAPreprintWasAccepted({reviewRequestId, acceptedAt: prereview.published.subtract('1d') as never })
]

test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.Result, _.Error>]>([
  [
    'review was requested via COAR notify',
    input,
    [...requested, reviewImported],
    Result.succeed({ ...prereview, requested: true }),
  ],
  [
    'review was requested via COAR notify (import event)',
    input,
    [requestImported, reviewImported],
    Result.succeed({ ...prereview, requested: true }),
  ],
  [
    'review was requested by PREreviewer',
    input,
    [requestedByPrereviewer, reviewImported],
    Result.succeed({ ...prereview, requested: true }),
  ],
  [
    'review was requested by PREreviewer (import event)',
    input,
    [requestByPrereviewerImported, reviewImported],
    Result.succeed({ ...prereview, requested: true }),
  ],
  [
    'review was requested and then withdrawn',
    input,
    [requested, requestWithdrawn, reviewImported, ],
    Result.succeed({ ...prereview, requested: false }),
  ],
  [
    'review was requested and withdrawn after review',
    input,
    [requested, requestWithdrawnAfterReview, reviewImported, ],
    Result.succeed({ ...prereview, requested: true }),
  ],
  [
    'review was requested day after plaindate review',
    input,
    [requestedDayAfter, reviewImportedWithPlainDate, ],
    Result.succeed({ ...prereview, requested: false }),
  ],
  [
    'review was requested same day as plaindate review',
    input,
    [requestedSameDay, reviewImportedWithPlainDate ],
    Result.succeed({ ...prereview, requested: true }),
  ],
  [
    'review was requested after review via COAR notify',
    input,
    [requestedAfterReview, reviewImported],
    Result.succeed({ ...prereview, requested: false }),
  ],
  [
    'review was requested after review via COAR notify (import event)',
    input,
    [requestAfterReviewImported, reviewImported],
    Result.succeed({ ...prereview, requested: false }),
  ],
  [
    'review was requested after review by PREreviewer',
    input,
    [requestedAfterReviewByPrereviewer, reviewImported],
    Result.succeed({ ...prereview, requested: false }),
  ],
  [
    'review was requested after review by PREreviewer (import event)',
    input,
    [requestAfterReviewByPrereviewerImported, reviewImported],
    Result.succeed({ ...prereview, requested: false }),
  ],
  [
    'author list contains pseudonym persona',
    input,
    [prereviewerRegistered, reviewWithPseudonymImported],
    Result.succeed({ ...prereview, authors: withPseudonymAuthor }),
  ],
  [
    'author list contains pseudonym persona (imported pseudonym)',
    input,
    [prereviewerImported, reviewWithPseudonymImported],
    Result.succeed({ ...prereview, authors: withPseudonymAuthor }),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetPublishedPreprintReview([])

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
*/
