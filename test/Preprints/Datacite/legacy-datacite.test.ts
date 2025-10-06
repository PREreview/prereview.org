import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import { rawHtml } from '../../../src/html.ts'
import * as _ from '../../../src/Preprints/Datacite/legacy-datacite.ts'
import { NotAPreprint, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
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
    test.prop([fc.africarxivUbuntunetPreprintId(), fc.plainDate()])(
      'from AfricArXiv on UbuntuNet Alliance',
      async (id, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
          body: {
            data: {
              id: '10.60763/africarxiv/1533',
              type: 'dois',
              attributes: {
                doi: id.value,
                prefix: '10.60763',
                suffix: 'africarxiv/1533',
                identifiers: [],
                alternateIdentifiers: [],
                creators: [
                  {
                    name: 'Sokolabe, Yisa Sarah',
                    nameType: 'Personal',
                    givenName: 'Yisa Sarah',
                    familyName: 'Sokolabe',
                    affiliation: [],
                    nameIdentifiers: [],
                  },
                  {
                    name: 'Ogunniyi, Tolulope',
                    nameType: 'Personal',
                    givenName: 'Tolulope',
                    familyName: 'Ogunniyi',
                    affiliation: [],
                    nameIdentifiers: [],
                  },
                ],
                titles: [
                  {
                    title:
                      'Primary Healthcare System Strengthening in Nigeria: A means to achieve Universal Health Coverage',
                  },
                ],
                publisher: 'My University',
                container: {},
                publicationYear: 2024,
                subjects: [
                  { subject: 'INTERDISCIPLINARY RESEARCH AREAS::Health and medical services in society' },
                  { subject: 'Health' },
                  { subject: 'SDG 3' },
                  { subject: 'SDG 10' },
                  { subject: 'Universal Health Coverage' },
                ],
                contributors: [
                  {
                    name: 'University, My',
                    nameType: 'Personal',
                    givenName: 'My',
                    familyName: 'University',
                    affiliation: [],
                    contributorType: 'DataManager',
                    nameIdentifiers: [],
                  },
                  {
                    name: 'University, My',
                    nameType: 'Personal',
                    givenName: 'My',
                    familyName: 'University',
                    affiliation: [],
                    contributorType: 'HostingInstitution',
                    nameIdentifiers: [],
                  },
                ],
                dates: [
                  { date: '2024-09-09', dateType: 'Accepted' },
                  { date: '2024-09-09', dateType: 'Available' },
                  { date: posted.toString(), dateType: 'Issued' },
                ],
                language: 'en',
                types: {
                  ris: 'RPRT',
                  bibtex: 'article',
                  citeproc: 'article-journal',
                  schemaOrg: 'ScholarlyArticle',
                  resourceType: 'Article',
                  resourceTypeGeneral: 'Text',
                },
                relatedIdentifiers: [],
                relatedItems: [],
                sizes: [],
                formats: [],
                version: null,
                rightsList: [],
                descriptions: [
                  {
                    description:
                      "According to the WHO, more than 1 billion individuals globally risk becoming impoverished because their household's out-of-pocket medical expenses account for 10% or more of their income. A shift in health systems towards primary health care (PHC) as a means to achieving universal health coverage (UHC) in low- and middle-income nations is important in preventing 60 million deaths and adding 3.7 years to the average life expectancy. Nigeria, ranked 187th among 191 countries in the WHO health system performance ranking, faces challenges with PHC owing to inadequate health infrastructure, a shortage of healthcare professionals, and weak health systems, impeding its progress toward achieving UHC. In achieving UHC, the country started prioritizing the revitalization of PHC through collaboration, making great strides in improving PHC, with hundreds of facilities being renovated and more healthcare professionals being hired and trained. Recently, almost 10 million children have received diphtheria and tetanus vaccines in Nigeria, and 4.95 million girls aged 9 to 14 in 15 states have received HPV vaccinations to protect them from cervical cancer. To better achieve UHC, Nigeria need to seek for more collaboration from the private sector and also, the brain drain of healthcare workers should be addressed by providing a sustainable working environment. Data availability statement: Data sharing is not applicable to this article as no new data were created or analyzed in this study.",
                    descriptionType: 'Abstract',
                  },
                ],
                geoLocations: [],
                fundingReferences: [],
                url: 'https://africarxiv.ubuntunet.net/handle/1/1649',
                contentUrl: null,
                metadataVersion: 0,
                schemaVersion: 'http://datacite.org/schema/kernel-3',
                source: 'mds',
                isActive: true,
                state: 'findable',
                reason: null,
                viewCount: 0,
                viewsOverTime: [],
                downloadCount: 0,
                downloadsOverTime: [],
                referenceCount: 0,
                citationCount: 0,
                citationsOverTime: [],
                partCount: 0,
                partOfCount: 0,
                versionCount: 0,
                versionOfCount: 0,
                created: '2024-10-03T12:36:19.000Z',
                registered: '2024-10-03T12:36:21.000Z',
                published: '2024',
                updated: '2024-10-03T12:36:21.000Z',
              },
              relationships: {
                client: { data: { id: 'eqhh.hgpcvf', type: 'clients' } },
                provider: { data: { id: 'eqhh', type: 'providers' } },
                media: { data: { id: '10.60763/africarxiv/1533', type: 'media' } },
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
            abstract: {
              language: 'en',
              text: expect.htmlContaining('<p>According to the WHO'),
            },
            authors: [
              { name: 'Yisa Sarah Sokolabe', orcid: undefined },
              { name: 'Tolulope Ogunniyi', orcid: undefined },
            ],
            id,
            posted,
            title: {
              language: 'en',
              text: rawHtml(
                'Primary Healthcare System Strengthening in Nigeria: A means to achieve Universal Health Coverage',
              ),
            },
            url: new URL('https://africarxiv.ubuntunet.net/handle/1/1649'),
          }),
        )
      },
    )

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

    test.prop([
      fc.psychArchivesPreprintId(),
      fc.plainDate(),
      fc.constantFrom({ resourceType: 'preprint', resourceTypeGeneral: 'Text' }, {}),
    ])('from PsychArchives', async (id, posted, type) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
        body: {
          data: {
            id: '10.23668/psycharchives.13965',
            type: 'dois',
            attributes: {
              doi: id.value,
              prefix: '10.23668',
              suffix: 'psycharchives.13965',
              identifiers: [{ identifier: 'https://hdl.handle.net/20.500.12034/8684.2', identifierType: 'uri' }],
              alternateIdentifiers: [
                { alternateIdentifierType: 'uri', alternateIdentifier: 'https://hdl.handle.net/20.500.12034/8684.2' },
              ],
              creators: [
                {
                  name: 'Ganster, Philipp',
                  nameType: 'Personal',
                  givenName: 'Philipp',
                  familyName: 'Ganster',
                  affiliation: [],
                  nameIdentifiers: [],
                },
              ],
              titles: [
                {
                  title:
                    'Infinit wachsen - Welche Bedingungen müssen wir schaffen, um unser individuelles Wachstum optimal zu fördern?',
                },
              ],
              publisher: 'PsychArchives',
              container: {},
              publicationYear: 2023,
              subjects: [
                { subject: 'Individualisierung' },
                { subject: 'Wachstum' },
                { subject: 'Aufklärung' },
                { subject: '150', subjectScheme: 'ddc' },
              ],
              contributors: [
                {
                  name: 'Leibniz Institut Für Psychologie (ZPID)',
                  affiliation: [],
                  contributorType: 'DataManager',
                  nameIdentifiers: [],
                },
                {
                  name: 'Leibniz Institut Für Psychologie (ZPID)',
                  affiliation: [],
                  contributorType: 'HostingInstitution',
                  nameIdentifiers: [],
                },
              ],
              dates: [
                { date: '2023-12-12', dateType: 'Accepted' },
                { date: '2023-09-07', dateType: 'Available' },
                { date: '2023-12-12', dateType: 'Available' },
                { date: posted.toString(), dateType: 'Issued' },
              ],
              language: null,
              types: {
                ris: 'RPRT',
                bibtex: 'article',
                citeproc: 'article-journal',
                schemaOrg: 'ScholarlyArticle',
                ...type,
              },
              relatedIdentifiers: [],
              relatedItems: [],
              sizes: [],
              formats: [],
              version: null,
              rightsList: [
                { rights: 'CC-BY-SA 4.0' },
                { rights: 'openAccess' },
                {
                  rights: 'Creative Commons Attribution Share Alike 4.0 International',
                  rightsUri: 'https://creativecommons.org/licenses/by-sa/4.0/legalcode',
                  schemeUri: 'https://spdx.org/licenses/',
                  rightsIdentifier: 'cc-by-sa-4.0',
                  rightsIdentifierScheme: 'SPDX',
                },
              ],
              descriptions: [
                {
                  description:
                    'Das Ziel dieser Arbeit ist es, bewusst und greifbar aufzuzeigen, wie und unter welchen Bedingungen wir unsere inneren Kräfte optimal entfalten können, um eine Antwort auf die Frage zu liefern: Wie können wir als Individuum infinit wachsen? Die Arbeit definiert ein mathematisches Modell, das die Dynamik des individuellen Wachstums aufzeigen soll und beschreibt detailliert und spekulativ die einzelnen dazugehörigen Größen. Es werden hypothetische Verläufe beschrieben: Unter welchen Bedingungen ein Individuum im Laufe der Zeit wächst und regressiert. Die Arbeit schließt mit einem ethischen Dilemma ab, was es bedeutet Mensch zu sein und zu bleiben, der in der Lage ist seine animalischen Triebe zu kontrollieren und wonach wir unser individuelles Wachstum im Kern ein Leben lang ausrichten sollten und für welche von zwei Optionen in dem ethischen Dilemma, sich künstliche Intelligenzen entscheiden würden.',
                  descriptionType: 'Abstract',
                },
              ],
              geoLocations: [],
              fundingReferences: [],
              xml: 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHJlc291cmNlIHhtbG5zPSJodHRwOi8vZGF0YWNpdGUub3JnL3NjaGVtYS9rZXJuZWwtMyIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeG1sbnM6ZHNwYWNlPSJodHRwOi8vd3d3LmRzcGFjZS5vcmcveG1sbnMvZHNwYWNlL2RpbSIgeHNpOnNjaGVtYUxvY2F0aW9uPSJodHRwOi8vZGF0YWNpdGUub3JnL3NjaGVtYS9rZXJuZWwtMyBodHRwOi8vc2NoZW1hLmRhdGFjaXRlLm9yZy9tZXRhL2tlcm5lbC0zL21ldGFkYXRhLnhzZCI+CiAgPGlkZW50aWZpZXIgaWRlbnRpZmllclR5cGU9IkRPSSI+MTAuMjM2NjgvUFNZQ0hBUkNISVZFUy4xMzk2NTwvaWRlbnRpZmllcj4KICA8Y3JlYXRvcnM+CiAgICA8Y3JlYXRvcj4KICAgICAgPGNyZWF0b3JOYW1lPkdhbnN0ZXIsIFBoaWxpcHA8L2NyZWF0b3JOYW1lPgogICAgPC9jcmVhdG9yPgogIDwvY3JlYXRvcnM+CiAgPHRpdGxlcz4KICAgIDx0aXRsZT5JbmZpbml0IHdhY2hzZW4gLSBXZWxjaGUgQmVkaW5ndW5nZW4gbcO8c3NlbiB3aXIgc2NoYWZmZW4sIHVtIHVuc2VyIGluZGl2aWR1ZWxsZXMgV2FjaHN0dW0gb3B0aW1hbCB6dSBmw7ZyZGVybj88L3RpdGxlPgogIDwvdGl0bGVzPgogIDxwdWJsaXNoZXI+UHN5Y2hBcmNoaXZlczwvcHVibGlzaGVyPgogIDxwdWJsaWNhdGlvblllYXI+MjAyMzwvcHVibGljYXRpb25ZZWFyPgogIDxzdWJqZWN0cz4KICAgIDxzdWJqZWN0PkluZGl2aWR1YWxpc2llcnVuZzwvc3ViamVjdD4KICAgIDxzdWJqZWN0PldhY2hzdHVtPC9zdWJqZWN0PgogICAgPHN1YmplY3Q+QXVma2zDpHJ1bmc8L3N1YmplY3Q+CiAgICA8c3ViamVjdCBzdWJqZWN0U2NoZW1lPSJkZGMiPjE1MDwvc3ViamVjdD4KICA8L3N1YmplY3RzPgogIDxjb250cmlidXRvcnM+CiAgICA8Y29udHJpYnV0b3IgY29udHJpYnV0b3JUeXBlPSJEYXRhTWFuYWdlciI+CiAgICAgIDxjb250cmlidXRvck5hbWU+TGVpYm5peiBJbnN0aXR1dCBmw7xyIFBzeWNob2xvZ2llIChaUElEKTwvY29udHJpYnV0b3JOYW1lPgogICAgPC9jb250cmlidXRvcj4KICAgIDxjb250cmlidXRvciBjb250cmlidXRvclR5cGU9Ikhvc3RpbmdJbnN0aXR1dGlvbiI+CiAgICAgIDxjb250cmlidXRvck5hbWU+TGVpYm5peiBJbnN0aXR1dCBmw7xyIFBzeWNob2xvZ2llIChaUElEKTwvY29udHJpYnV0b3JOYW1lPgogICAgPC9jb250cmlidXRvcj4KICA8L2NvbnRyaWJ1dG9ycz4KICA8ZGF0ZXM+CiAgICA8ZGF0ZSBkYXRlVHlwZT0iQWNjZXB0ZWQiPjIwMjMtMTItMTI8L2RhdGU+CiAgICA8ZGF0ZSBkYXRlVHlwZT0iQXZhaWxhYmxlIj4yMDIzLTA5LTA3PC9kYXRlPgogICAgPGRhdGUgZGF0ZVR5cGU9IkF2YWlsYWJsZSI+MjAyMy0xMi0xMjwvZGF0ZT4KICAgIDxkYXRlIGRhdGVUeXBlPSJJc3N1ZWQiPjIwMjMtMTItMTI8L2RhdGU+CiAgPC9kYXRlcz4KICA8cmVzb3VyY2VUeXBlIHJlc291cmNlVHlwZUdlbmVyYWw9IlRleHQiPnByZXByaW50PC9yZXNvdXJjZVR5cGU+CiAgPGFsdGVybmF0ZUlkZW50aWZpZXJzPgogICAgPGFsdGVybmF0ZUlkZW50aWZpZXIgYWx0ZXJuYXRlSWRlbnRpZmllclR5cGU9InVyaSI+aHR0cHM6Ly9oZGwuaGFuZGxlLm5ldC8yMC41MDAuMTIwMzQvODY4NC4yPC9hbHRlcm5hdGVJZGVudGlmaWVyPgogIDwvYWx0ZXJuYXRlSWRlbnRpZmllcnM+CiAgPHJpZ2h0c0xpc3Q+CiAgICA8cmlnaHRzPkNDLUJZLVNBIDQuMDwvcmlnaHRzPgogICAgPHJpZ2h0cz5vcGVuQWNjZXNzPC9yaWdodHM+CiAgICA8cmlnaHRzIHJpZ2h0c1VSST0iaHR0cHM6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL2xpY2Vuc2VzL2J5LXNhLzQuMC8iLz4KICA8L3JpZ2h0c0xpc3Q+CiAgPGRlc2NyaXB0aW9ucz4KICAgIDxkZXNjcmlwdGlvbiBkZXNjcmlwdGlvblR5cGU9IkFic3RyYWN0Ij5EYXMgWmllbCBkaWVzZXIgQXJiZWl0IGlzdCBlcywgYmV3dXNzdCB1bmQgZ3JlaWZiYXIgYXVmenV6ZWlnZW4sIHdpZSB1bmQgdW50ZXIgd2VsY2hlbiBCZWRpbmd1bmdlbiB3aXIgdW5zZXJlIGlubmVyZW4gS3LDpGZ0ZSBvcHRpbWFsIGVudGZhbHRlbiBrw7ZubmVuLCB1bSBlaW5lIEFudHdvcnQgYXVmIGRpZSBGcmFnZSB6dSBsaWVmZXJuOiBXaWUga8O2bm5lbiB3aXIgYWxzIEluZGl2aWR1dW0gaW5maW5pdCB3YWNoc2VuPyBEaWUgQXJiZWl0IGRlZmluaWVydCBlaW4gbWF0aGVtYXRpc2NoZXMgTW9kZWxsLCBkYXMgZGllIER5bmFtaWsgZGVzIGluZGl2aWR1ZWxsZW4gV2FjaHN0dW1zIGF1ZnplaWdlbiBzb2xsIHVuZCBiZXNjaHJlaWJ0IGRldGFpbGxpZXJ0IHVuZCBzcGVrdWxhdGl2IGRpZSBlaW56ZWxuZW4gZGF6dWdlaMO2cmlnZW4gR3LDtsOfZW4uIEVzIHdlcmRlbiBoeXBvdGhldGlzY2hlIFZlcmzDpHVmZSBiZXNjaHJpZWJlbjogVW50ZXIgd2VsY2hlbiBCZWRpbmd1bmdlbiBlaW4gSW5kaXZpZHV1bSBpbSBMYXVmZSBkZXIgWmVpdCB3w6RjaHN0IHVuZCByZWdyZXNzaWVydC4gRGllIEFyYmVpdCBzY2hsaWXDn3QgbWl0IGVpbmVtIGV0aGlzY2hlbiBEaWxlbW1hIGFiLCB3YXMgZXMgYmVkZXV0ZXQgTWVuc2NoIHp1IHNlaW4gdW5kIHp1IGJsZWliZW4sIGRlciBpbiBkZXIgTGFnZSBpc3Qgc2VpbmUgYW5pbWFsaXNjaGVuIFRyaWViZSB6dSBrb250cm9sbGllcmVuIHVuZCB3b25hY2ggd2lyIHVuc2VyIGluZGl2aWR1ZWxsZXMgV2FjaHN0dW0gaW0gS2VybiBlaW4gTGViZW4gbGFuZyBhdXNyaWNodGVuIHNvbGx0ZW4gdW5kIGbDvHIgd2VsY2hlIHZvbiB6d2VpIE9wdGlvbmVuIGluIGRlbSBldGhpc2NoZW4gRGlsZW1tYSwgc2ljaCBrw7xuc3RsaWNoZSBJbnRlbGxpZ2VuemVuIGVudHNjaGVpZGVuIHfDvHJkZW4uPC9kZXNjcmlwdGlvbj4KICA8L2Rlc2NyaXB0aW9ucz4KPC9yZXNvdXJjZT4=',
              url: 'https://www.psycharchives.org/jspui/handle/20.500.12034/8684.2',
              contentUrl: null,
              metadataVersion: 1,
              schemaVersion: 'http://datacite.org/schema/kernel-3',
              source: 'mds',
              isActive: true,
              state: 'findable',
              reason: null,
              viewCount: 0,
              viewsOverTime: [],
              downloadCount: 0,
              downloadsOverTime: [],
              referenceCount: 0,
              citationCount: 0,
              citationsOverTime: [],
              partCount: 0,
              partOfCount: 0,
              versionCount: 0,
              versionOfCount: 0,
              created: '2023-12-12T15:10:08.000Z',
              registered: '2023-12-12T15:10:20.000Z',
              published: '2023',
              updated: '2023-12-12T15:20:09.000Z',
            },
            relationships: {
              client: { data: { id: 'gesis.psycharc', type: 'clients' } },
              provider: { data: { id: 'vpwd', type: 'providers' } },
              media: { data: { id: '10.23668/psycharchives.13965', type: 'media' } },
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
          abstract: {
            language: 'de',
            text: expect.htmlContaining('<p>Das Ziel dieser Arbeit ist es,'),
          },
          authors: [{ name: 'Philipp Ganster', orcid: undefined }],
          id,
          posted,
          title: {
            language: 'de',
            text: rawHtml(
              'Infinit wachsen - Welche Bedingungen müssen wir schaffen, um unser individuelles Wachstum optimal zu fördern?',
            ),
          },
          url: new URL('https://www.psycharchives.org/jspui/handle/20.500.12034/8684.2'),
        }),
      )
    })
  })

  test.prop([
    fc.legacyDatacitePreprintId().filter(id => id._tag !== 'ArcadiaSciencePreprintId'),
    fc.instant(),
    fc.string(),
  ])('when the DOI is not for a preprint', async (id, posted, type) => {
    const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
      body: {
        data: {
          id: '10.48550/arxiv.2207.10516',
          type: 'dois',
          attributes: {
            doi: id.value,
            identifiers: [{ identifier: '2207.10516', identifierType: 'arXiv' }],
            alternateIdentifiers: [{ alternateIdentifierType: 'arXiv', alternateIdentifier: '2207.10516' }],
            creators: [
              {
                name: 'Lipcsei, Sándor',
                nameType: 'Personal',
                givenName: 'Sándor',
                familyName: 'Lipcsei',
                affiliation: [],
                nameIdentifiers: [],
              },
              {
                name: 'Kalácska, Szilvia',
                nameType: 'Personal',
                givenName: 'Szilvia',
                familyName: 'Kalácska',
                affiliation: [],
                nameIdentifiers: [],
              },
              {
                name: 'Ispánovity, Péter Dusán',
                nameType: 'Personal',
                givenName: 'Péter Dusán',
                familyName: 'Ispánovity',
                affiliation: [],
                nameIdentifiers: [],
              },
              {
                name: 'Lábár, János L.',
                nameType: 'Personal',
                givenName: 'János L.',
                familyName: 'Lábár',
                affiliation: [],
                nameIdentifiers: [],
              },
              {
                name: 'Dankházi, Zoltán',
                nameType: 'Personal',
                givenName: 'Zoltán',
                familyName: 'Dankházi',
                affiliation: [],
                nameIdentifiers: [],
              },
              {
                name: 'Groma, István',
                nameType: 'Personal',
                givenName: 'István',
                familyName: 'Groma',
                affiliation: [],
                nameIdentifiers: [],
              },
            ],
            titles: [
              { title: 'Statistical analysis of dislocation cells in uniaxially deformed copper single crystals' },
            ],
            publisher: 'arXiv',
            container: {},
            publicationYear: 2022,
            subjects: [
              { lang: 'en', subject: 'Materials Science (cond-mat.mtrl-sci)', subjectScheme: 'arXiv' },
              { subject: 'FOS: Physical sciences', subjectScheme: 'Fields of Science and Technology (FOS)' },
              {
                subject: 'FOS: Physical sciences',
                schemeUri: 'http://www.oecd.org/science/inno/38235147.pdf',
                subjectScheme: 'Fields of Science and Technology (FOS)',
              },
            ],
            contributors: [],
            dates: [
              { date: posted.toString(), dateType: 'Submitted', dateInformation: 'v1' },
              { date: '2022-07-22T00:22:41Z', dateType: 'Updated', dateInformation: 'v1' },
              { date: '2022-07', dateType: 'Available', dateInformation: 'v1' },
              { date: '2022', dateType: 'Issued' },
            ],
            language: null,
            types: {
              ris: 'GEN',
              bibtex: 'misc',
              citeproc: 'article',
              schemaOrg: 'CreativeWork',
              resourceType: 'Article',
              resourceTypeGeneral: type,
            },
            relatedIdentifiers: [],
            relatedItems: [],
            sizes: [],
            formats: [],
            version: '1',
            rightsList: [
              {
                rights: 'Creative Commons Attribution Non Commercial No Derivatives 4.0 International',
                rightsUri: 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode',
                schemeUri: 'https://spdx.org/licenses/',
                rightsIdentifier: 'cc-by-nc-nd-4.0',
                rightsIdentifierScheme: 'SPDX',
              },
            ],
            descriptions: [
              {
                description:
                  'The dislocation microstructure developing during plastic deformation strongly influences the stress-strain properties of crystalline materials. The novel method of high resolution electron backscatter diffraction (HR-EBSD) offers a new perspective to study dislocation patterning. In this work copper single crystals deformed in uniaxial compression were investigated by HR-EBSD, X-ray line profile analysis, and transmission electron microscopy (TEM). With these methods the maps of the internal stress, the Nye tensor, and the geometrically necessary dislocation (GND) density were determined at different load levels. In agreement with the composite model long-range internal stress was directly observed in the cell interiors. Moreover, it is found from the fractal analysis of the GND maps that the fractal dimension of the cell structure is decreasing with increasing average spatial dislocation density fluctuation. It is shown that the evolution of different types of dislocations can be successfully monitored with this scanning electron microscopy based technique.',
                descriptionType: 'Abstract',
              },
              {
                description: 'Submitted to Journal: Materialia. Manuscript number: MTLA-D-22-00602',
                descriptionType: 'Other',
              },
            ],
            geoLocations: [],
            fundingReferences: [],
            url: 'https://arxiv.org/abs/2207.10516',
            contentUrl: null,
            metadataVersion: 0,
            schemaVersion: 'http://datacite.org/schema/kernel-4',
            source: 'mds',
            isActive: true,
            state: 'findable',
            reason: null,
            viewCount: 0,
            viewsOverTime: [],
            downloadCount: 0,
            downloadsOverTime: [],
            referenceCount: 0,
            citationCount: 0,
            citationsOverTime: [],
            partCount: 0,
            partOfCount: 0,
            versionCount: 0,
            versionOfCount: 0,
            created: '2022-07-22T01:09:39.000Z',
            registered: '2022-07-22T01:09:40.000Z',
            published: '2022',
            updated: '2022-07-22T01:09:40.000Z',
          },
          relationships: {
            client: { data: { id: 'arxiv.content', type: 'clients' } },
            provider: { data: { id: 'arxiv', type: 'providers' } },
            media: { data: { id: '10.48550/arxiv.2207.10516', type: 'media' } },
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

    expect(actual).toStrictEqual(E.left(new NotAPreprint({})))
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
