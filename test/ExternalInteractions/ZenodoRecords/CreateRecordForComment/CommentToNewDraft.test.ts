import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as Prereviewers from '../../../../src/Domain/Prereviewers/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ZenodoRecords/CreateRecordForComment/CommentToNewDraft.ts'
import { html } from '../../../../src/html.ts'
import { Doi, Name, OrcidId, Pseudonym } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

test('with a public author and a preprint with a DOI', () => {
  const actual = _.CommentToNewDraft({
    author: new Prereviewers.PublicPersona({
      name: Option.some(Name.Name('Josiah Carberry')),
      orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
    }),
    comment: html`<p>Some comment.</p>`,
    prereview: {
      doi: Doi.Doi('10.5281/zenodo.24540607'),
      url: new URL('https://prereview.org/reviews/24540607'),
      preprint: {
        id: new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2026.09.01.748474') }),
        title: html`A <i>preprint</i> title`,
      },
    },
    publicationDate: Temporal.PlainDate.from('2026-11-27'),
  })

  expect(actual).toStrictEqual({
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
      description: expect.any(String),
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
  expect(normalizeWhitespace(actual.metadata['description'] as string)).toStrictEqual(
    '<p> <strong >This Zenodo record is a permanently preserved version of a comment on a PREreview. You can view the complete PREreview and comments at <a href="https://prereview.org/reviews/24540607">https://prereview.org/reviews/24540607</a>.</strong > </p> <p>Some comment.</p>',
  )
})

test('with a pseudonymous author and a PhilSci preprint', () => {
  const actual = _.CommentToNewDraft({
    author: new Prereviewers.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
    comment: html`<p>Some comment.</p>`,
    prereview: {
      doi: Doi.Doi('10.5281/zenodo.24540607'),
      url: new URL('https://prereview.org/reviews/24540607'),
      preprint: {
        id: new Preprints.PhilsciPreprintId({ value: 12345 }),
        title: html`A preprint title`,
      },
    },
    publicationDate: Temporal.PlainDate.from('2026-11-27'),
  })

  expect(actual.metadata['creators']).toStrictEqual([
    { person_or_org: { type: 'personal', family_name: 'Orange Panda' } },
  ])
  expect(actual.metadata['related_identifiers']).toStrictEqual([
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

const normalizeWhitespace = (text: string) => text.replaceAll(/\s+/g, ' ').trim()
