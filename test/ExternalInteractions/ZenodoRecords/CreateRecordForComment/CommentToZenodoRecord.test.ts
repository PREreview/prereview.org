import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as Prereviewers from '../../../../src/Domain/Prereviewers/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ZenodoRecords/CreateRecordForComment/CommentToZenodoRecord.ts'
import { html, rawHtml } from '../../../../src/html.ts'
import { Doi, Name, NonEmptyString, OrcidId, Pseudonym } from '../../../../src/types/index.ts'
import { describe, expect, test } from '../../../vitest.ts'

const comment = {
  author: new Prereviewers.PublicPersona({
    name: Option.some(Name.Name('Josiah Carberry')),
    orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
  }),
  comment: html`<p>Some comment.</p>`,
  competingInterests: Option.some(NonEmptyString.NonEmptyString('Some competing interests')),
  prereview: {
    doi: Doi.Doi('10.5281/zenodo.24540607'),
    url: new URL('https://prereview.org/reviews/24540607'),
    preprint: {
      id: new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2026.09.01.748474') }),
      title: html`A <i>preprint</i> title`,
    },
  },
  publicationDate: Temporal.PlainDate.from('2026-11-27'),
} satisfies _.Comment

test('creates the draft', () => {
  const { draft } = _.CommentToZenodoRecord(comment)

  expect({ ...draft, metadata: { ...draft.metadata, description: undefined } }).toStrictEqual({
    access: { record: 'public', files: 'public' },
    files: { enabled: true },
    metadata: {
      resource_type: { id: 'publication-other' },
      title: 'Comment on a PREreview of “A preprint title”',
      creators: [
        {
          person_or_org: {
            type: 'personal',
            family_name: 'Josiah Carberry',
            identifiers: [{ scheme: 'orcid', identifier: '0000-0002-1825-0097' }],
          },
        },
      ],
      description: undefined,
      publisher: 'Zenodo',
      publication_date: '2026-11-27',
      rights: [{ id: 'cc-by-4.0' }],
      related_identifiers: [
        {
          identifier: '10.1101/2026.09.01.748474',
          scheme: 'doi',
          relation_type: { id: 'references' },
          resource_type: { id: 'publication-preprint' },
        },
        {
          identifier: '10.5281/zenodo.24540607',
          scheme: 'doi',
          relation_type: { id: 'references' },
          resource_type: { id: 'publication-peerreview' },
        },
      ],
    },
  })
  expect(rawHtml(draft.metadata['description'] as string)).toStrictEqual(html`
    <p>
      <strong>
        This Zenodo record is a permanently preserved version of a comment on a PREreview. You can view the complete
        PREreview and comments at
        <a href="https://prereview.org/reviews/24540607">https://prereview.org/reviews/24540607</a>.
      </strong>
    </p>

    <p>Some comment.</p>

    <h2><span>Competing interests</span></h2>

    <p>Some competing interests</p>
  `)
})

describe('creates the file', () => {
  test('with competing interests', () => {
    const { file } = _.CommentToZenodoRecord(comment)

    expect(file.name).toStrictEqual('comment.html')
    expect(rawHtml(file.content)).toStrictEqual(html`
      <p>Some comment.</p>

      <h2><span>Competing interests</span></h2>

      <p>Some competing interests</p>
    `)
  })

  test('without competing interests', () => {
    const { file } = _.CommentToZenodoRecord({ ...comment, competingInterests: Option.none() })

    expect(rawHtml(file.content)).toStrictEqual(html`
      <p>Some comment.</p>

      <h2><span>Competing interests</span></h2>

      <p><span>The author of this comment declares that they have no competing interests.</span></p>
    `)
  })
})

test('with a pseudonymous author and a PhilSci preprint', () => {
  const { draft } = _.CommentToZenodoRecord({
    ...comment,
    author: new Prereviewers.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
    prereview: {
      ...comment.prereview,
      preprint: { id: new Preprints.PhilsciPreprintId({ value: 12345 }), title: html`A preprint title` },
    },
  })

  expect(draft.metadata['creators']).toStrictEqual([
    { person_or_org: { type: 'personal', family_name: 'Orange Panda' } },
  ])
  expect(draft.metadata['related_identifiers']).toStrictEqual([
    {
      identifier: 'https://philsci-archive.pitt.edu/12345/',
      scheme: 'url',
      relation_type: { id: 'references' },
      resource_type: { id: 'publication-preprint' },
    },
    {
      identifier: '10.5281/zenodo.24540607',
      scheme: 'doi',
      relation_type: { id: 'references' },
      resource_type: { id: 'publication-peerreview' },
    },
  ])
})
