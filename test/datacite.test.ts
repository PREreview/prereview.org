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
            { name: 'Sándor Lipcsei' },
            { name: 'Szilvia Kalácska' },
            { name: 'Péter Dusán Ispánovity' },
            { name: 'János L. Lábár' },
            { name: 'Zoltán Dankházi' },
            { name: 'István Groma' },
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

      expect(actual).toStrictEqual(E.left('not-found'))
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
