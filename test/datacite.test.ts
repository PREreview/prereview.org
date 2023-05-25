import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/datacite'
import { rawHtml } from '../src/html'
import * as fc from './fc'

describe('isDatacitePreprintDoi', () => {
  test.prop([fc.datacitePreprintDoi()])('with a DataCite DOI', doi => {
    expect(_.isDatacitePreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.doi()])('with a non-DataCite DOI', doi => {
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

        const actual = await _.getPreprintFromDatacite(id)({ fetch })()

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

      const actual = await _.getPreprintFromDatacite(id)({ fetch })()

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

    test.prop([fc.arxivPreprintId(), fc.instant()])('from arXiv', async (id, posted) => {
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
      })

      const actual = await _.getPreprintFromDatacite(id)({ fetch })()

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

      const actual = await _.getPreprintFromDatacite(id)({ fetch })()

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

    const actual = await _.getPreprintFromDatacite(id)({ fetch })()

    expect(actual).toStrictEqual(E.left('not-found'))
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

      const actual = await _.getPreprintFromDatacite(id)({ fetch })()

      expect(actual).toStrictEqual(E.left('not-a-preprint'))
    },
  )

  test.prop([fc.datacitePreprintId(), fc.record({ status: fc.integer(), body: fc.string() })])(
    'when the preprint cannot be loaded',
    async (id, response) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`https://api.datacite.org/dois/${encodeURIComponent(id.value)}`, response)

      const actual = await _.getPreprintFromDatacite(id)({ fetch })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})
