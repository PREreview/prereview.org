import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/datacite.js'
import { rawHtml } from '../src/html.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('isDatacitePreprintDoi', () => {
  test.prop([fc.datacitePreprintDoi()])('with a DataCite DOI', doi => {
    expect(_.isDatacitePreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.oneof(fc.crossrefPreprintDoi(), fc.nonPreprintDoi())])('with a non-DataCite DOI', doi => {
    expect(_.isDatacitePreprintDoi(doi)).toBe(false)
  })
})

describe('getPreprintFromDatacite', () => {
  describe('when the preprint can be loaded', () => {
    test.prop([fc.africarxivFigsharePreprintId(), fc.plainDate()])(
      'from AfricArXiv on Figshare',
      async (id, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
          body: {
            data: {
              id: '10.6084/m9.figshare.19064801.v1',
              type: 'dois',
              attributes: {
                doi: id.value,
                identifiers: [],
                alternateIdentifiers: [],
                creators: [
                  {
                    name: 'NOGBOU, Noel-David',
                    givenName: 'Noel-David',
                    familyName: 'NOGBOU',
                    affiliation: [],
                    nameIdentifiers: [],
                  },
                  {
                    name: 'PHOFA, Dikwata Thabiso',
                    givenName: 'Dikwata Thabiso',
                    familyName: 'PHOFA',
                    affiliation: [],
                    nameIdentifiers: [],
                  },
                  {
                    name: 'OBI, Lawrence Chikwela',
                    givenName: 'Lawrence Chikwela',
                    familyName: 'OBI',
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-0068-2035',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                    affiliation: [],
                  },
                  {
                    name: 'MUSYOKI, Andrew Munyalo',
                    givenName: 'Andrew Munyalo',
                    familyName: 'MUSYOKI',
                    nameIdentifiers: [
                      {
                        schemeUri: 'https://orcid.org',
                        nameIdentifier: 'https://orcid.org/0000-0002-6577-6155',
                        nameIdentifierScheme: 'ORCID',
                      },
                    ],
                    affiliation: [],
                  },
                ],
                titles: [
                  {
                    title:
                      'Revisiting drug resistance mechanisms of a notorious nosocomial pathogen: Acinetobacter baumannii',
                  },
                ],
                publisher: 'AfricArXiv',
                container: {},
                publicationYear: 2022,
                subjects: [
                  {
                    subject: '110303 Clinical Microbiology',
                    schemeUri: 'http://www.abs.gov.au/ausstats/abs@.nsf/0/6BB427AB9696C225CA2574180004463E',
                    subjectScheme: 'FOR',
                  },
                  {
                    subject: 'FOS: Clinical medicine',
                    schemeUri: 'http://www.oecd.org/science/inno/38235147.pdf',
                    subjectScheme: 'Fields of Science and Technology (FOS)',
                  },
                  {
                    subject: '110801 Medical Bacteriology',
                    schemeUri: 'http://www.abs.gov.au/ausstats/abs@.nsf/0/6BB427AB9696C225CA2574180004463E',
                    subjectScheme: 'FOR',
                  },
                  {
                    subject: 'FOS: Health sciences',
                    schemeUri: 'http://www.oecd.org/science/inno/38235147.pdf',
                    subjectScheme: 'Fields of Science and Technology (FOS)',
                  },
                ],
                contributors: [],
                dates: [
                  { date: posted.toString(), dateType: 'Created' },
                  { date: '2022-01-26', dateType: 'Updated' },
                  { date: '2022', dateType: 'Issued' },
                ],
                language: null,
                types: {
                  ris: 'RPRT',
                  bibtex: 'article',
                  citeproc: 'article-journal',
                  schemaOrg: 'ScholarlyArticle',
                  resourceType: 'Preprint',
                  resourceTypeGeneral: 'Text',
                },
                relatedIdentifiers: [
                  {
                    relationType: 'IsIdenticalTo',
                    relatedIdentifier: '10.6084/m9.figshare.19064801',
                    relatedIdentifierType: 'DOI',
                  },
                ],
                relatedItems: [],
                sizes: ['552868 Bytes'],
                formats: [],
                version: null,
                rightsList: [
                  {
                    rights: 'Creative Commons Attribution 4.0 International',
                    rightsUri: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                    schemeUri: 'https://spdx.org/licenses/',
                    rightsIdentifier: 'cc-by-4.0',
                    rightsIdentifierScheme: 'SPDX',
                  },
                ],
                descriptions: [
                  {
                    description:
                      'Mini review on mechanisms and strategies expressed by <i>A. baumannii</i> to resist biological compounds with antagonistic activity on their growth<br><br>Acinetobacter baumannii (A. baumannii) has a propensity to develop, acquire and transmit antibiotic resistance-associated genes. This ability has enabled the proliferation of the species in harsh living conditions like the hospital environment. It is well known that a quasi-permanent contact between the bacterium and antibiotics has contributed to the improvement of expressed resistance mechanisms, but also, literature highlights the natural living conditions in which survival strategies have led the species to develop mechanisms and systems to establish their niche, sometimes in very competitive environment. All these mechanisms and strategies which are expressed, sometimes in response to antibiotics exposure or to just sustain viability, have enabled the rise of this bacteria species as a successful nosocomial pathogen. Here we review drug resistance mechanisms and strategies for environmental survival employed by this bacterium to consolidate information relevant for the current search for alternative management of infections caused by A. baumannii.<br>',
                    descriptionType: 'Abstract',
                  },
                ],
                geoLocations: [],
                fundingReferences: [],
                url: 'https://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801/1',
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
                created: '2022-01-26T09:37:19.000Z',
                registered: '2022-01-26T09:37:20.000Z',
                published: '2022',
                updated: '2022-01-26T09:37:21.000Z',
              },
              relationships: {
                client: { data: { id: 'figshare.ars', type: 'clients' } },
                provider: { data: { id: 'otjm', type: 'providers' } },
                media: { data: { id: '10.6084/m9.figshare.19064801.v1', type: 'media' } },
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

        const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.stringContaining('<p>Mini review on mechanisms'),
            },
            authors: [
              { name: 'Noel-David NOGBOU', orcid: undefined },
              { name: 'Dikwata Thabiso PHOFA', orcid: undefined },
              { name: 'Lawrence Chikwela OBI', orcid: '0000-0002-0068-2035' },
              { name: 'Andrew Munyalo MUSYOKI', orcid: '0000-0002-6577-6155' },
            ],
            id,
            posted,
            title: {
              language: 'en',
              text: rawHtml(
                'Revisiting drug resistance mechanisms of a notorious nosocomial pathogen: Acinetobacter baumannii',
              ),
            },
            url: new URL(
              'https://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801/1',
            ),
          }),
        )
      },
    )
    test.prop([fc.africarxivZenodoPreprintId(), fc.plainDate()])('from AfricArXiv on Zenodo', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
        body: {
          data: {
            id: '10.5281/zenodo.4290795',
            type: 'dois',
            attributes: {
              doi: id.value,
              prefix: '10.5281',
              suffix: 'zenodo.4290795',
              identifiers: [],
              alternateIdentifiers: [],
              creators: [
                {
                  name: 'Bezuidenhout, Louise',
                  givenName: 'Louise',
                  familyName: 'Bezuidenhout',
                  affiliation: ['University of Oxford'],
                  nameIdentifiers: [
                    {
                      schemeUri: 'https://orcid.org',
                      nameIdentifier: 'https://orcid.org/0000-0003-4328-3963',
                      nameIdentifierScheme: 'ORCID',
                    },
                  ],
                },
                {
                  name: 'Havemann, Johanna',
                  givenName: 'Johanna',
                  familyName: 'Havemann',
                  affiliation: ['Access2Perspectives, AfricArXiv'],
                  nameIdentifiers: [
                    {
                      schemeUri: 'https://orcid.org',
                      nameIdentifier: 'https://orcid.org/0000-0002-6157-1494',
                      nameIdentifierScheme: 'ORCID',
                    },
                  ],
                },
              ],
              titles: [{ title: 'The Varying Openness of Digital Open Science Tools' }],
              publisher: 'Zenodo',
              container: {
                type: 'Series',
                identifier: 'https://zenodo.org/communities/access2perspectives',
                identifierType: 'URL',
              },
              publicationYear: 2020,
              subjects: [{ subject: 'Open Science, reproducible, digital, ecosystem' }],
              contributors: [],
              dates: [{ date: posted.toString(), dateType: 'Issued' }],
              language: null,
              types: {
                ris: 'RPRT',
                bibtex: 'article',
                citeproc: 'article-journal',
                schemaOrg: 'ScholarlyArticle',
                resourceType: 'Preprint',
                resourceTypeGeneral: 'Text',
              },
              relatedIdentifiers: [
                {
                  relationType: 'IsSupplementedBy',
                  relatedIdentifier: '10.5281/zenodo.4013812',
                  resourceTypeGeneral: 'Dataset',
                  relatedIdentifierType: 'DOI',
                },
                {
                  relationType: 'IsVersionOf',
                  relatedIdentifier: '10.5281/zenodo.4013974',
                  relatedIdentifierType: 'DOI',
                },
                {
                  relationType: 'IsPartOf',
                  relatedIdentifier: 'https://zenodo.org/communities/access2perspectives',
                  relatedIdentifierType: 'URL',
                },
                {
                  relationType: 'IsPartOf',
                  relatedIdentifier: 'https://zenodo.org/communities/africarxiv',
                  relatedIdentifierType: 'URL',
                },
              ],
              relatedItems: [],
              sizes: [],
              formats: [],
              version: null,
              rightsList: [
                {
                  rights: 'Creative Commons Attribution 4.0 International',
                  rightsUri: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                  schemeUri: 'https://spdx.org/licenses/',
                  rightsIdentifier: 'cc-by-4.0',
                  rightsIdentifierScheme: 'SPDX',
                },
                { rights: 'Open Access', rightsUri: 'info:eu-repo/semantics/openAccess' },
              ],
              descriptions: [
                {
                  description:
                    'Digital tools that support Open Science practices play a key role in the seamless accumulation, archiving and dissemination of scholarly data, outcomes and conclusions. Despite their integration into Open Science practices, the providence and design of these digital tools are rarely explicitly scrutinized. This means that influential factors, such as the funding models of the parent organizations, their geographic location, and the dependency on digital infrastructures are rarely considered. Suggestions from literature and anecdotal evidence already draw attention to the impact of these factors, and raise the question of whether the Open Science ecosystem can realise the aspiration to become a truly “unlimited digital commons” in its current structure. In an online research approach, we compiled and analysed the geolocation, terms and conditions as well as funding models of 242 digital tools increasingly being used by researchers in various disciplines. Our findings indicate that design decisions and restrictions are biased towards researchers in North American and European scholarly communities. In order to make the future Open Science ecosystem inclusive and operable for researchers in all world regions including Africa, Latin America, Asia and Oceania, those should be actively included in design decision processes. Digital Open Science Tools carry the promise of enabling collaboration across disciplines, world regions and language groups through responsive design. We therefore encourage long term funding mechanisms and ethnically as well as culturally inclusive approaches serving local prerequisites and conditions to tool design and construction allowing a globally connected digital research infrastructure to evolve in a regionally balanced manner.',
                  descriptionType: 'Abstract',
                },
              ],
              geoLocations: [],
              fundingReferences: [],
              url: 'https://zenodo.org/record/4290795',
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
              citationCount: 2,
              citationsOverTime: [{ year: '2020', total: 2 }],
              partCount: 0,
              partOfCount: 0,
              versionCount: 0,
              versionOfCount: 1,
              created: '2020-11-25T16:58:01.000Z',
              registered: '2020-11-25T16:58:02.000Z',
              published: '2020',
              updated: '2020-11-25T16:58:02.000Z',
            },
            relationships: {
              client: { data: { id: 'cern.zenodo', type: 'clients' } },
              provider: { data: { id: 'cern', type: 'providers' } },
              media: { data: { id: '10.5281/zenodo.4290795', type: 'media' } },
              references: { data: [] },
              citations: {
                data: [
                  { id: '10.5281/zenodo.4334113', type: 'dois' },
                  { id: '10.5281/zenodo.4334112', type: 'dois' },
                ],
              },
              parts: { data: [] },
              partOf: { data: [] },
              versions: { data: [] },
              versionOf: { data: [{ id: '10.5281/zenodo.4013974', type: 'dois' }] },
            },
          },
        },
      })

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: expect.stringContaining('<p>Digital tools that support'),
          },
          authors: [
            { name: 'Louise Bezuidenhout', orcid: '0000-0003-4328-3963' },
            { name: 'Johanna Havemann', orcid: '0000-0002-6157-1494' },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('The Varying Openness of Digital Open Science Tools'),
          },
          url: new URL('https://zenodo.org/record/4290795'),
        }),
      )
    })

    test.prop([fc.arxivPreprintId(), fc.instant(), fc.constantFrom('Preprint', 'Text')])(
      'from arXiv',
      async (id, posted, type) => {
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

        const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.stringContaining('<p>The dislocation microstructure'),
            },
            authors: [
              { name: 'Sándor Lipcsei', orcid: undefined },
              { name: 'Szilvia Kalácska', orcid: undefined },
              { name: 'Péter Dusán Ispánovity', orcid: undefined },
              { name: 'János L. Lábár', orcid: undefined },
              { name: 'Zoltán Dankházi', orcid: undefined },
              { name: 'István Groma', orcid: undefined },
            ],
            id,
            posted: posted.toZonedDateTimeISO('UTC').toPlainDate(),
            title: {
              language: 'en',
              text: rawHtml('Statistical analysis of dislocation cells in uniaxially deformed copper single crystals'),
            },
            url: new URL('https://arxiv.org/abs/2207.10516'),
          }),
        )
      },
    )

    test.prop([fc.osfPreprintId(), fc.plainDate()])('from OSF', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
        body: {
          data: {
            id: '10.17605/osf.io/eq8bk',
            type: 'dois',
            attributes: {
              doi: id.value,
              prefix: '10.17605',
              suffix: 'osf.io/eq8bk',
              identifiers: [{ identifier: 'https://osf.io/eq8bk', identifierType: 'URL' }],
              alternateIdentifiers: [{ alternateIdentifierType: 'URL', alternateIdentifier: 'https://osf.io/eq8bk' }],
              creators: [
                {
                  name: 'Da Silva, Maria Isabel Caetano',
                  nameType: 'Personal',
                  givenName: 'Maria Isabel Caetano',
                  familyName: 'Da Silva',
                  affiliation: [],
                  nameIdentifiers: [{ nameIdentifier: 'https://osf.io/bejuy', nameIdentifierScheme: 'URL' }],
                },
                {
                  name: 'Eglídia Carla Figueirêdo Vidal',
                  nameType: 'Personal',
                  affiliation: [],
                  nameIdentifiers: [{ nameIdentifier: 'https://osf.io/p3t8m', nameIdentifierScheme: 'URL' }],
                },
                {
                  name: 'De Sena, Aline Sampaio Rolim',
                  nameType: 'Personal',
                  givenName: 'Aline Sampaio Rolim',
                  familyName: 'De Sena',
                  affiliation: [],
                  nameIdentifiers: [{ nameIdentifier: 'https://osf.io/dh3qp', nameIdentifierScheme: 'URL' }],
                },
                {
                  name: 'De Farias Rodrigues, Marina Pessoa',
                  nameType: 'Personal',
                  givenName: 'Marina Pessoa',
                  familyName: 'De Farias Rodrigues',
                  affiliation: [],
                  nameIdentifiers: [{ nameIdentifier: 'https://osf.io/d86sz', nameIdentifierScheme: 'URL' }],
                },
                {
                  name: 'Bezerra, Gabriela Duarte',
                  nameType: 'Personal',
                  givenName: 'Gabriela Duarte',
                  familyName: 'Bezerra',
                  affiliation: [],
                  nameIdentifiers: [
                    {
                      schemeUri: 'https://orcid.org',
                      nameIdentifier: 'https://orcid.org/0000-0002-7472-4621',
                      nameIdentifierScheme: 'ORCID',
                    },
                    { nameIdentifier: 'https://osf.io/2xgv4', nameIdentifierScheme: 'URL' },
                  ],
                },
                {
                  name: 'WONESKA RODRIGUES PINHEIRO',
                  nameType: 'Personal',
                  affiliation: [],
                  nameIdentifiers: [{ nameIdentifier: 'https://osf.io/gcse5', nameIdentifierScheme: 'URL' }],
                },
              ],
              titles: [
                {
                  lang: 'por',
                  title:
                    'Teorias De Enfermagem Para Abordagem Familiar De Potenciais Doadores De Órgãos: revisão de escopo',
                },
              ],
              publisher: 'OSF',
              container: {},
              publicationYear: 2023,
              subjects: [
                { subject: 'Abordagem familiar' },
                { subject: 'Doação de órgãos' },
                { subject: 'Entrevista' },
                { subject: 'Morte Cerebral' },
                { subject: 'Revisão de Escopo' },
                { subject: 'Teorias de Enfermagem' },
              ],
              contributors: [
                {
                  name: 'Center For Open Science',
                  nameType: 'Organizational',
                  affiliation: [],
                  contributorType: 'HostingInstitution',
                  nameIdentifiers: [
                    { nameIdentifier: 'https://cos.io/', nameIdentifierScheme: 'URL' },
                    {
                      schemeUri: 'https://ror.org',
                      nameIdentifier: 'https://ror.org/05d5mza29',
                      nameIdentifierScheme: 'ROR',
                    },
                  ],
                },
              ],
              dates: [
                { date: posted.toString(), dateType: 'Created' },
                { date: '2023-09-13', dateType: 'Updated' },
                { date: '2023', dateType: 'Issued' },
              ],
              language: 'pt',
              types: {
                ris: 'GEN',
                bibtex: 'misc',
                citeproc: 'article',
                schemaOrg: 'CreativeWork',
                resourceType: 'Project',
                resourceTypeGeneral: 'Preprint',
              },
              relatedIdentifiers: [],
              relatedItems: [],
              sizes: [],
              formats: [],
              version: null,
              rightsList: [
                {
                  rights: 'Creative Commons Attribution 4.0 International',
                  rightsUri: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                  schemeUri: 'https://spdx.org/licenses/',
                  rightsIdentifier: 'cc-by-4.0',
                  rightsIdentifierScheme: 'SPDX',
                },
              ],
              descriptions: [
                {
                  lang: 'por',
                  description:
                    'Revisão de Escopo realizada no período de novembro de 2022 a junho de 2023, que objetivou mapear na literatura quais teorias de enfermagem e estruturas conceituais podem contribuir por suas características na abordagem familiar de potenciais doadores. A revisão foi realizada nas bases de dados LILACS, SCOPUS, SciELO, MEDLINE, EMBASE e Web of science, que foram acessadas via Biblioteca Virtual em Saúde e via Pubmed, bem como, na literatura cinzenta, Google acadêmico e na lista de referência dos estudos. A amostra foi composta por 14 estudos, onde foram identificadas 9 Teorias de Enfermagem.',
                  descriptionType: 'Abstract',
                },
              ],
              geoLocations: [],
              fundingReferences: [],
              url: 'https://osf.io/eq8bk/',
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
              created: '2023-09-13T01:58:23.000Z',
              registered: '2023-09-13T01:58:23.000Z',
              published: '2023',
              updated: '2023-09-13T01:58:24.000Z',
            },
            relationships: {
              client: { data: { id: 'cos.osf', type: 'clients' } },
              provider: { data: { id: 'cos', type: 'providers' } },
              media: { data: { id: '10.17605/osf.io/eq8bk', type: 'media' } },
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

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'pt',
            text: expect.stringContaining('<p>Revisão de Escopo realizada no período'),
          },
          authors: [
            { name: 'Maria Isabel Caetano Da Silva', orcid: undefined },
            { name: 'Eglídia Carla Figueirêdo Vidal' },
            { name: 'Aline Sampaio Rolim De Sena', orcid: undefined },
            { name: 'Marina Pessoa De Farias Rodrigues', orcid: undefined },
            { name: 'Gabriela Duarte Bezerra', orcid: '0000-0002-7472-4621' },
            { name: 'WONESKA RODRIGUES PINHEIRO' },
          ],
          id,
          posted,
          title: {
            language: 'pt',
            text: rawHtml(
              'Teorias De Enfermagem Para Abordagem Familiar De Potenciais Doadores De Órgãos: revisão de escopo',
            ),
          },
          url: new URL('https://osf.io/eq8bk/'),
        }),
      )
    })

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

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'de',
            text: expect.stringContaining('<p>Das Ziel dieser Arbeit ist es,'),
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

    test.prop([fc.zenodoPreprintId(), fc.plainDate(), fc.string()])('from Zenodo', async (id, posted, publisher) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, {
        body: {
          data: {
            id: '10.5281/zenodo.7955181',
            type: 'dois',
            attributes: {
              doi: id.value,
              prefix: '10.5281',
              suffix: 'zenodo.7955181',
              identifiers: [],
              alternateIdentifiers: [],
              creators: [
                { name: 'Ding, Keyang', givenName: 'Keyang', familyName: 'Ding', affiliation: [], nameIdentifiers: [] },
              ],
              titles: [{ title: 'The Counting Functions of Prime Pairs' }],
              publisher,
              container: {},
              publicationYear: 2023,
              subjects: [{ subject: 'The counting functions of prime pairs, prime number' }],
              contributors: [],
              dates: [{ date: posted.toString(), dateType: 'Issued' }],
              language: null,
              types: {
                ris: 'GEN',
                bibtex: 'misc',
                citeproc: 'article',
                schemaOrg: 'CreativeWork',
                resourceTypeGeneral: 'Preprint',
              },
              relatedIdentifiers: [
                {
                  relationType: 'IsVersionOf',
                  relatedIdentifier: '10.5281/zenodo.7955180',
                  relatedIdentifierType: 'DOI',
                },
              ],
              relatedItems: [],
              sizes: [],
              formats: [],
              version: null,
              rightsList: [
                {
                  rights: 'Creative Commons Attribution 4.0 International',
                  rightsUri: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                  schemeUri: 'https://spdx.org/licenses/',
                  rightsIdentifier: 'cc-by-4.0',
                  rightsIdentifierScheme: 'SPDX',
                },
                { rights: 'Open Access', rightsUri: 'info:eu-repo/semantics/openAccess' },
              ],
              descriptions: [
                {
                  description:
                    'The counting functions of prime pairs are derived. The asymptotic behavior of the prime pair counting functions are also analyzed.',
                  descriptionType: 'Abstract',
                },
              ],
              geoLocations: [],
              fundingReferences: [],
              xml: 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHJlc291cmNlIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vZGF0YWNpdGUub3JnL3NjaGVtYS9rZXJuZWwtNCIgeHNpOnNjaGVtYUxvY2F0aW9uPSJodHRwOi8vZGF0YWNpdGUub3JnL3NjaGVtYS9rZXJuZWwtNCBodHRwOi8vc2NoZW1hLmRhdGFjaXRlLm9yZy9tZXRhL2tlcm5lbC00LjEvbWV0YWRhdGEueHNkIj4KICA8aWRlbnRpZmllciBpZGVudGlmaWVyVHlwZT0iRE9JIj4xMC41MjgxL1pFTk9ETy43OTU1MTgxPC9pZGVudGlmaWVyPgogIDxjcmVhdG9ycz4KICAgIDxjcmVhdG9yPgogICAgICA8Y3JlYXRvck5hbWU+RGluZywgS2V5YW5nPC9jcmVhdG9yTmFtZT4KICAgICAgPGdpdmVuTmFtZT5LZXlhbmc8L2dpdmVuTmFtZT4KICAgICAgPGZhbWlseU5hbWU+RGluZzwvZmFtaWx5TmFtZT4KICAgIDwvY3JlYXRvcj4KICA8L2NyZWF0b3JzPgogIDx0aXRsZXM+CiAgICA8dGl0bGU+VGhlIENvdW50aW5nIEZ1bmN0aW9ucyBvZiBQcmltZSBQYWlyczwvdGl0bGU+CiAgPC90aXRsZXM+CiAgPHB1Ymxpc2hlcj5aZW5vZG88L3B1Ymxpc2hlcj4KICA8cHVibGljYXRpb25ZZWFyPjIwMjM8L3B1YmxpY2F0aW9uWWVhcj4KICA8c3ViamVjdHM+CiAgICA8c3ViamVjdD5UaGUgY291bnRpbmcgZnVuY3Rpb25zIG9mIHByaW1lIHBhaXJzLCBwcmltZSBudW1iZXI8L3N1YmplY3Q+CiAgPC9zdWJqZWN0cz4KICA8ZGF0ZXM+CiAgICA8ZGF0ZSBkYXRlVHlwZT0iSXNzdWVkIj4yMDIzLTA1LTIxPC9kYXRlPgogIDwvZGF0ZXM+CiAgPHJlc291cmNlVHlwZSByZXNvdXJjZVR5cGVHZW5lcmFsPSJQcmVwcmludCIvPgogIDxhbHRlcm5hdGVJZGVudGlmaWVycz4KICAgIDxhbHRlcm5hdGVJZGVudGlmaWVyIGFsdGVybmF0ZUlkZW50aWZpZXJUeXBlPSJ1cmwiPmh0dHBzOi8vemVub2RvLm9yZy9yZWNvcmQvNzk1NTE4MTwvYWx0ZXJuYXRlSWRlbnRpZmllcj4KICA8L2FsdGVybmF0ZUlkZW50aWZpZXJzPgogIDxyZWxhdGVkSWRlbnRpZmllcnM+CiAgICA8cmVsYXRlZElkZW50aWZpZXIgcmVsYXRlZElkZW50aWZpZXJUeXBlPSJET0kiIHJlbGF0aW9uVHlwZT0iSXNWZXJzaW9uT2YiPjEwLjUyODEvemVub2RvLjc5NTUxODA8L3JlbGF0ZWRJZGVudGlmaWVyPgogIDwvcmVsYXRlZElkZW50aWZpZXJzPgogIDxyaWdodHNMaXN0PgogICAgPHJpZ2h0cyByaWdodHNVUkk9Imh0dHBzOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS80LjAvbGVnYWxjb2RlIj5DcmVhdGl2ZSBDb21tb25zIEF0dHJpYnV0aW9uIDQuMCBJbnRlcm5hdGlvbmFsPC9yaWdodHM+CiAgICA8cmlnaHRzIHJpZ2h0c1VSST0iaW5mbzpldS1yZXBvL3NlbWFudGljcy9vcGVuQWNjZXNzIj5PcGVuIEFjY2VzczwvcmlnaHRzPgogIDwvcmlnaHRzTGlzdD4KICA8ZGVzY3JpcHRpb25zPgogICAgPGRlc2NyaXB0aW9uIGRlc2NyaXB0aW9uVHlwZT0iQWJzdHJhY3QiPiZsdDtwJmd0O1RoZSBjb3VudGluZyBmdW5jdGlvbnMgb2YgcHJpbWUgcGFpcnMgYXJlIGRlcml2ZWQuIFRoZSBhc3ltcHRvdGljIGJlaGF2aW9yIG9mIHRoZSBwcmltZSBwYWlyIGNvdW50aW5nIGZ1bmN0aW9ucyBhcmUgYWxzbyBhbmFseXplZC4mbHQ7L3AmZ3Q7PC9kZXNjcmlwdGlvbj4KICA8L2Rlc2NyaXB0aW9ucz4KPC9yZXNvdXJjZT4=',
              url: 'https://zenodo.org/record/7955181',
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
              created: '2023-05-21T21:17:21.000Z',
              registered: '2023-05-21T21:17:22.000Z',
              published: '2023',
              updated: '2023-05-21T21:17:22.000Z',
            },
            relationships: {
              client: { data: { id: 'cern.zenodo', type: 'clients' } },
              provider: { data: { id: 'cern', type: 'providers' } },
              media: { data: { id: '10.5281/zenodo.7955181', type: 'media' } },
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

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: expect.stringContaining('<p>The counting functions of prime pairs'),
          },
          authors: [{ name: 'Keyang Ding', orcid: undefined }],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('The Counting Functions of Prime Pairs'),
          },
          url: new URL('https://zenodo.org/record/7955181'),
        }),
      )
    })

    test.prop([fc.arxivPreprintId(), fc.instant()])('when the response is stale', async (id, posted) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          (url, { cache }) =>
            url === `https://api.datacite.org/dois/${encodeURIComponent(id.value)}` && cache === 'force-cache',
          {
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
                    {
                      title: 'Statistical analysis of dislocation cells in uniaxially deformed copper single crystals',
                    },
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
                    resourceTypeGeneral: 'Preprint',
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
            headers: { 'X-Local-Cache-Status': 'stale' },
          },
        )
        .getOnce(
          (url, { cache }) =>
            url === `https://api.datacite.org/dois/${encodeURIComponent(id.value)}` && cache === 'no-cache',
          { throws: new Error('Network error') },
        )

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: () => Promise.resolve() })()

      expect(actual).toStrictEqual(
        E.right(
          expect.objectContaining({
            title: {
              language: 'en',
              text: rawHtml('Statistical analysis of dislocation cells in uniaxially deformed copper single crystals'),
            },
          }),
        ),
      )
      expect(fetch.done()).toBeTruthy()
    })
  })

  test.prop([fc.datacitePreprintId()])('when the preprint is not found', async id => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, { status: Status.NotFound })

    const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

    expect(actual).toStrictEqual(E.left('not-found'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.arxivPreprintId(), fc.instant(), fc.string()])(
    'when the DOI is not for a preprint',
    async (id, posted, type) => {
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

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual(E.left('not-a-preprint'))
    },
  )

  test.prop([fc.datacitePreprintId(), fc.record({ status: fc.integer(), body: fc.string() })])(
    'when the preprint cannot be loaded',
    async (id, response) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, response)

      const actual = await _.getPreprintFromDatacite(id)({ fetch, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )
})
