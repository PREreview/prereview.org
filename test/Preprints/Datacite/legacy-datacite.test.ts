import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import { rawHtml } from '../../../src/html.ts'
import * as _ from '../../../src/Preprints/Datacite/legacy-datacite.ts'
import { PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import * as fc from '../../fc.ts'

describe('isDatacitePreprintDoi', () => {
  test.prop([fc.legacyDatacitePreprintDoi()])('with a DataCite DOI', doi => {
    expect(_.isDatacitePreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.oneof(fc.crossrefPreprintDoi(), fc.japanLinkCenterPreprintDoi(), fc.nonPreprintDoi())])(
    'with a non-DataCite DOI',
    doi => {
      expect(_.isDatacitePreprintDoi(doi)).toBe(false)
    },
  )
})

describe('getPreprintFromDatacite', () => {
  describe('when the preprint can be loaded', () => {
    test.prop([fc.arcadiaSciencePreprintId(), fc.integer({ min: -9999, max: 9999 }), fc.string()])(
      'from Arcadia Science',
      async (id, posted, type) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
          body: {
            data: {
              id: id.value,
              type: 'dois',
              attributes: {
                doi: id.value,
                prefix: '10.57844',
                suffix: 'arcadia-085e-3ecf',
                identifiers: [],
                alternateIdentifiers: [],
                creators: [
                  {
                    name: 'Avasthi, Prachee',
                    nameType: 'Personal',
                    givenName: 'Prachee',
                    familyName: 'Avasthi',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-1688-722X',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Braverman, Ben',
                    nameType: 'Personal',
                    givenName: 'Ben',
                    familyName: 'Braverman',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [],
                  },
                  {
                    name: 'Bigge, Brae M.',
                    nameType: 'Personal',
                    givenName: 'Brae M.',
                    familyName: 'Bigge',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-0907-4597',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Essock-Burns, Tara',
                    nameType: 'Personal',
                    givenName: 'Tara',
                    familyName: 'Essock-Burns',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0003-4159-6974',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Lane, Ryan',
                    nameType: 'Personal',
                    givenName: 'Ryan',
                    familyName: 'Lane',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-5887-2069',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Mets, David G.',
                    nameType: 'Personal',
                    givenName: 'David G.',
                    familyName: 'Mets',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-0803-0912',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Patton, Austin H.',
                    nameType: 'Personal',
                    givenName: 'Austin H.',
                    familyName: 'Patton',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0003-1286-9005',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'York, Ryan',
                    nameType: 'Personal',
                    givenName: 'Ryan',
                    familyName: 'York',
                    affiliation: ['Arcadia Science'],
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-1073-1494',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                ],
                titles: [
                  { lang: 'en-US', title: 'Raman spectroscopy enables rapid and inexpensive exploration of biology' },
                ],
                publisher: 'Arcadia Science',
                container: {},
                publicationYear: 2024,
                subjects: [],
                contributors: [
                  {
                    name: 'Bell, Audrey',
                    nameType: 'Personal',
                    givenName: 'Audrey',
                    familyName: 'Bell',
                    affiliation: ['Arcadia Science'],
                    contributorType: 'Other',
                    nameIdentifiers: [],
                  },
                  {
                    name: 'Hochstrasser, Megan L.',
                    nameType: 'Personal',
                    givenName: 'Megan L.',
                    familyName: 'Hochstrasser',
                    affiliation: ['Arcadia Science'],
                    contributorType: 'Other',
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-4404-078X',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'MacQuarrie, Cameron Dale',
                    nameType: 'Personal',
                    givenName: 'Cameron Dale',
                    familyName: 'MacQuarrie',
                    affiliation: ['Arcadia Science'],
                    contributorType: 'Other',
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0001-9504-6375',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Sun, Dennis A.',
                    nameType: 'Personal',
                    givenName: 'Dennis A.',
                    familyName: 'Sun',
                    affiliation: ['Arcadia Science'],
                    contributorType: 'Other',
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0003-1000-7276',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                  {
                    name: 'Wood, Harper',
                    nameType: 'Personal',
                    givenName: 'Harper',
                    familyName: 'Wood',
                    affiliation: ['Arcadia Science'],
                    contributorType: 'Other',
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0009-0006-0277-1855',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                  },
                ],
                dates: [{ date: posted.toString(), dateType: 'Issued' }],
                language: 'en',
                types: {
                  ris: 'JOUR',
                  bibtex: 'article',
                  citeproc: 'article-journal',
                  schemaOrg: 'ScholarlyArticle',
                  resourceTypeGeneral: type,
                },
                relatedIdentifiers: [
                  {
                    relationType: 'IsSupplementedBy',
                    relatedIdentifier: 'https://github.com/Arcadia-Science/2024-disco-raman-hackathon/tree/v1.0',
                    resourceTypeGeneral: 'Other',
                    relatedIdentifierType: 'URL',
                  },
                ],
                relatedItems: [],
                sizes: ['4021 words'],
                formats: ['text/html'],
                version: '1.0',
                rightsList: [
                  {
                    lang: 'en-US',
                    rights: 'Creative Commons Attribution 4.0 International',
                    rightsUri: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                    schemeUri: 'https://spdx.org/licenses/',
                    rightsIdentifier: 'cc-by-4.0',
                    rightsIdentifierScheme: 'SPDX',
                  },
                ],
                descriptions: [],
                geoLocations: [],
                fundingReferences: [],
                url: 'https://research.arcadiascience.com/pub/result-easy-raman-spectroscopy',
                contentUrl: null,
                metadataVersion: 0,
                schemaVersion: 'http://datacite.org/schema/kernel-4',
                source: 'api',
                isActive: true,
                state: 'findable',
                reason: null,
                viewCount: 0,
                viewsOverTime: [],
                downloadCount: 0,
                downloadsOverTime: [],
                referenceCount: 1,
                citationCount: 0,
                citationsOverTime: [],
                partCount: 0,
                partOfCount: 0,
                versionCount: 0,
                versionOfCount: 0,
                created: '2024-05-31T23:42:05.000Z',
                registered: '2024-05-31T23:42:05.000Z',
                published: '2024',
                updated: '2024-06-04T23:42:04.000Z',
              },
              relationships: {
                client: { data: { id: 'anbe.sfiyeb', type: 'clients' } },
                provider: { data: { id: 'anbe', type: 'providers' } },
                media: { data: { id: '10.57844/arcadia-085e-3ecf', type: 'media' } },
                references: { data: [] },
                citations: { data: [] },
                parts: { data: [] },
                partOf: { data: [] },
                versions: { data: [] },
                versionOf: { data: [] },
              },
            },
          },
        })

        const actual = await _.getPreprintFromDatacite(id)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: undefined,
            authors: [
              { name: 'Prachee Avasthi', orcid: OrcidId('0000-0002-1688-722X') },
              { name: 'Ben Braverman', orcid: undefined },
              { name: 'Brae M. Bigge', orcid: OrcidId('0000-0002-0907-4597') },
              { name: 'Tara Essock-Burns', orcid: OrcidId('0000-0003-4159-6974') },
              { name: 'Ryan Lane', orcid: OrcidId('0000-0002-5887-2069') },
              { name: 'David G. Mets', orcid: OrcidId('0000-0002-0803-0912') },
              { name: 'Austin H. Patton', orcid: OrcidId('0000-0003-1286-9005') },
              { name: 'Ryan York', orcid: OrcidId('0000-0002-1073-1494') },
            ],
            id,
            posted,
            title: {
              language: 'en',
              text: rawHtml('Raman spectroscopy enables rapid and inexpensive exploration of biology'),
            },
            url: new URL('https://research.arcadiascience.com/pub/result-easy-raman-spectroscopy'),
          }),
        )
      },
    )
  })

  test.prop([fc.legacyDatacitePreprintId(), fc.record({ status: fc.integer(), body: fc.string() })])(
    'when the preprint cannot be loaded',
    async (id, response) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, response)

      const actual = await _.getPreprintFromDatacite(id)({ fetch })()

      expect(actual).toStrictEqual(E.left(new PreprintIsUnavailable({})))
      expect(fetch.done()).toBeTruthy()
    },
  )
})
