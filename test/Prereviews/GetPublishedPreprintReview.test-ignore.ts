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
    named: [{ name: Name('Josiah Carberry'), orcid: OrcidId('0000-0002-1825-0097') }],
    anonymous: 0,
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
      name: Option.some(prereview.authors.named[0].name),
      orcidId: prereview.authors.named[0].orcid,
    },
  ],
  otherAuthors: prereview.authors.anonymous,
  doi: prereview.doi,
  id: prereview.id,
  license: prereview.license,
  published: prereview.published,
  preprint: prereview.preprintId,
  live: prereview.live,
  useOfAi: { _tag: 'No' },
  competingInterests: { _tag: 'No' },
  language: prereview.language,
  content: { _tag: 'FreeText', text: prereview.text },
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.Result, _.Error>]>([
  ['no events', input, [], Result.fail(new PrereviewIsNotFound())],
  ['review imported', input, [reviewImported], Result.succeed(prereview)],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetPublishedPreprintReview([])

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
