import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as _ from '../src/crossref.js'
import { rawHtml } from '../src/html.js'
import { NotAPreprint, PreprintIsNotFound, PreprintIsUnavailable } from '../src/preprint.js'
import * as fc from './fc.js'

describe('isCrossrefPreprintDoi', () => {
  test.prop([fc.legacyCrossrefPreprintDoi()])('with a Crossref DOI', doi => {
    expect(_.isCrossrefPreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.oneof(fc.datacitePreprintDoi(), fc.japanLinkCenterPreprintDoi(), fc.nonPreprintDoi())])(
    'with a non-Crossref DOI',
    doi => {
      expect(_.isCrossrefPreprintDoi(doi)).toBe(false)
    },
  )
})

describe('getPreprintFromCrossref', () => {
  describe('when the preprint can be loaded', () => {
    test.prop([fc.advancePreprintId(), fc.plainDate()])('from Advance', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            institution: [{ name: 'Advance' }],
            indexed: { 'date-parts': [[2024, 8, 23]], 'date-time': '2024-08-23T00:17:46Z', timestamp: 1724372266218 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'Preprints',
            'reference-count': 0,
            publisher: 'SAGE Publications',
            license: [
              {
                start: { 'date-parts': [[2024, 8, 20]], 'date-time': '2024-08-20T00:00:00Z', timestamp: 1724112000000 },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0/',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2024, 8, 20]] },
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2024, 8, 20]], 'date-time': '2024-08-20T14:02:46Z', timestamp: 1724162566000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ["Policy Recommendations for Blended Learning in Vietnam's Colleges and Universities"],
            prefix: '10.31124',
            author: [
              {
                ORCID: 'http://orcid.org/0000-0002-7115-1725',
                'authenticated-orcid': true,
                given: 'Le Khanh',
                family: 'Tuan',
                sequence: 'first',
                affiliation: [{ name: 'Saigon University' }],
              },
              {
                given: 'Thi Ngoc',
                family: 'Nguyen',
                sequence: 'additional',
                affiliation: [{ name: 'Saigon University' }],
              },
              {
                given: 'Kieu Hung',
                family: 'Ly',
                sequence: 'additional',
                affiliation: [{ name: 'Saigon University' }],
              },
              { given: 'Thi', family: 'Thanh', sequence: 'additional', affiliation: [] },
              { given: 'Ha', family: 'Dang', sequence: 'additional', affiliation: [{ name: 'Saigon University' }] },
              { given: 'Van', family: 'Anh', sequence: 'additional', affiliation: [] },
              {
                given: 'Hai',
                family: 'Tong',
                sequence: 'additional',
                affiliation: [{ name: 'Thang Technical College' }],
              },
            ],
            member: '179',
            'container-title': [],
            'original-title': [],
            deposited: { 'date-parts': [[2024, 8, 22]], 'date-time': '2024-08-22T18:56:39Z', timestamp: 1724352999000 },
            score: 1,
            resource: {
              primary: {
                URL: 'https://advance.sagepub.com/users/812679/articles/1216107-policy-recommendations-for-blended-learning-in-vietnam-s-colleges-and-universities?commit=59bf4695a5ff4b5ed0ca0b35ac8f48928a94aaae',
              },
            },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2024, 8, 20]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31124/advance.172416255.59522334/v1',
            relation: {},
            subject: [],
            published: { 'date-parts': [[2024, 8, 20]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: undefined,
          authors: [
            { name: 'Le Khanh Tuan', orcid: '0000-0002-7115-1725' },
            { name: 'Thi Ngoc Nguyen', orcid: undefined },
            { name: 'Kieu Hung Ly', orcid: undefined },
            { name: 'Thi Thanh', orcid: undefined },
            { name: 'Ha Dang', orcid: undefined },
            { name: 'Van Anh', orcid: undefined },
            { name: 'Hai Tong', orcid: undefined },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml("Policy Recommendations for Blended Learning in Vietnam's Colleges and Universities"),
          },
          url: new URL(
            'https://advance.sagepub.com/users/812679/articles/1216107-policy-recommendations-for-blended-learning-in-vietnam-s-colleges-and-universities?commit=59bf4695a5ff4b5ed0ca0b35ac8f48928a94aaae',
          ),
        }),
      )
    })

    test.prop([fc.africarxivOsfPreprintId(), fc.plainDate()])('from AfricArXiv on OSF', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: {
              'date-parts': [[2022, 4, 5]],
              'date-time': '2022-04-05T12:39:59Z',
              timestamp: 1649162399284,
            },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'AfricArXiv',
            'reference-count': 0,
            publisher: 'Center for Open Science',
            license: [
              {
                start: {
                  'date-parts': [[2019, 9, 10]],
                  'date-time': '2019-09-10T00:00:00Z',
                  timestamp: 1568073600000,
                },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'http://www.gnu.org/licenses/gpl-2.0.txt',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<p>The Beninese agricultural sector suffers mainly from a lack of financing. This study, conducted on a random sample of 150 households in Parakou commune, shows that participatory financing with a counterpart in agricultural product is an alternative to financing the production of local farms. Food among the population of Parakou consists mainly of cereals, particularly maize (according to 75% of households surveyed). Non-agricultural households purchase agricultural products according to their purchasing power and the economic situation. This study confirms that people are suffering from social injustice caused by an increase in product prices caused by the agricultural financing activity of loan sharks.  It should be noted that 75% of households are willing to adopt the participatory financing proposed in this article. Households are ready to buy at an average price of 12.172 XOF/Kg.</p>',
            DOI: id.value,
            type: 'posted-content',
            created: {
              'date-parts': [[2019, 9, 10]],
              'date-time': '2019-09-10T12:36:21Z',
              timestamp: 1568118981000,
            },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['LE FINANCEMENT PARTICIPATIF\u00a0: UNE ALTERNATIVE AU FINANCEMENT AGRICOLE AU BENIN'],
            prefix: '10.31730',
            author: [{ given: 'Abdoul kafid Chabi', family: 'TOKO KOUTOGUI', sequence: 'first', affiliation: [] }],
            member: '15934',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2019, 9, 10]],
              'date-time': '2019-09-10T12:36:22Z',
              timestamp: 1568118982000,
            },
            score: 1,
            resource: { primary: { URL: 'https://osf.io/yv9az' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2019, 9, 10]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31730/osf.io/yv9az',
            relation: {},
            published: { 'date-parts': [[2019, 9, 10]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: expect.stringContaining('<p>The Beninese agricultural sector'),
          },
          authors: [{ name: 'Abdoul kafid Chabi TOKO KOUTOGUI', orcid: undefined }],
          id,
          posted,
          title: {
            language: 'fr',
            text: expect.stringContaining('LE FINANCEMENT PARTICIPATIF'),
          },
          url: new URL('https://osf.io/yv9az'),
        }),
      )
    })

    describe('from Authorea', () => {
      test.prop([fc.authoreaPreprintId(), fc.plainDate()])('newer format', async (id, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              institution: [{ name: 'Authorea, Inc.' }],
              indexed: { 'date-parts': [[2023, 8, 9]], 'date-time': '2023-08-09T04:31:50Z', timestamp: 1691555510982 },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'Preprints',
              'reference-count': 0,
              publisher: 'Authorea, Inc.',
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              accepted: { 'date-parts': [[2023, 8, 8]] },
              abstract:
                '<jats:p id="p1">Some properties of the Dawson Integral are presented first in the\ncurrent work, followed by the introduction of the Dawson Integral\nTransform. Iteration identities and relationships, similar to the\nParseval Goldstein type, are established involving various well-known\nintegral transforms, such as the Laplace Transform, the L 2 -Transform,\nand the Dawson Integral for the new integral transform. Furthermore,\nimproper integrals of well-known functions, including the Dawson\nIntegral, Exponential Integral, and the Macdonald Function, are\nevaluated using the results obtained.</jats:p>',
              DOI: id.value,
              type: 'posted-content',
              created: { 'date-parts': [[2023, 8, 8]], 'date-time': '2023-08-08T07:04:16Z', timestamp: 1691478256000 },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: ['The Dawson Transform and its Applications'],
              prefix: '10.22541',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0002-2160-6138',
                  'authenticated-orcid': true,
                  given: 'Osman',
                  family: 'Yurekli',
                  sequence: 'first',
                  affiliation: [{ name: 'Ithaca College' }],
                },
                {
                  given: 'Durmuş',
                  family: 'ALBAYRAK',
                  sequence: 'additional',
                  affiliation: [{ name: 'Marmara University' }],
                },
                {
                  given: 'Fatih',
                  family: 'AYLIKCI',
                  sequence: 'additional',
                  affiliation: [{ name: 'Yıldız Technical University' }],
                },
                {
                  given: 'Neşe',
                  family: 'Dernek',
                  sequence: 'additional',
                  affiliation: [{ name: 'Marmara University' }],
                },
              ],
              member: '9829',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2023, 8, 8]],
                'date-time': '2023-08-08T07:04:16Z',
                timestamp: 1691478256000,
              },
              score: 1,
              resource: {
                primary: {
                  URL: 'https://www.authorea.com/users/650382/articles/658890-the-dawson-transform-and-its-applications?commit=01d29945f3c355adc7d8a88d50b80a32f9ec078e',
                },
              },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2023, 8, 8]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.22541/au.169147825.53935627/v1',
              relation: {},
              published: { 'date-parts': [[2023, 8, 8]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprintFromCrossref(id)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.stringContaining('<p>Some properties of the Dawson Integral are presented first'),
            },
            authors: [
              { name: 'Osman Yurekli', orcid: '0000-0002-2160-6138' },
              { name: 'Durmuş ALBAYRAK', orcid: undefined },
              { name: 'Fatih AYLIKCI', orcid: undefined },
              { name: 'Neşe Dernek', orcid: undefined },
            ],
            id,
            posted,
            title: {
              language: 'en',
              text: rawHtml('The Dawson Transform and its Applications'),
            },
            url: new URL(
              'https://www.authorea.com/users/650382/articles/658890-the-dawson-transform-and-its-applications?commit=01d29945f3c355adc7d8a88d50b80a32f9ec078e',
            ),
          }),
        )
      })

      test.prop([fc.authoreaPreprintId(), fc.plainDate()])('older format', async (id, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              institution: [{ name: 'Authorea, Inc.' }],
              indexed: { 'date-parts': [[2023, 8, 11]], 'date-time': '2023-08-11T04:35:23Z', timestamp: 1691728523623 },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'Preprints',
              'reference-count': 0,
              publisher: 'Authorea, Inc.',
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              accepted: { 'date-parts': [[2023, 8, 10]] },
              abstract:
                '<jats:p id="p1">Phlebia genus is a relevant group of fungi with crucial role in numerous\necosystems. In tropical and subtropical areas this genus allows the\nefficient degradation of lignin and carbon recovery; however, the\nmajority of these fungal species remains undiscovered. The main purpose\nof this work was to determine the enzymatic activity of extracellular\nproteins of a novel <jats:italic>Phlebia floridensis</jats:italic> strain isolated in\nYucatan Peninsula, Mexico. The results that are reported here\ndemonstrate that soluble protein extract of <jats:italic>P. floridensis</jats:italic> can\ndegrade a broad spectrum of recalcitrant compounds. This induced protein\nextract is able to modify not only phenolic and non-phenolic compounds,\nbut also anthroquinone dyes, even without addition of exogenous hydrogen\nperoxide. Using LC-MS/MS, we were able to identify a novel\nchloroperoxidase in enzymatic extract. As far as we know, this is the\nfirst report about the presence of this type of enzyme in Phlebia genus.</jats:p>',
              DOI: id.value,
              type: 'posted-content',
              created: { 'date-parts': [[2023, 8, 10]], 'date-time': '2023-08-10T18:00:56Z', timestamp: 1691690456000 },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: [
                'White-rot fungus Phlebia floridensis ITM 12: laccase production, oxidoreductase profile and hydrogen-peroxide independent activity.',
              ],
              prefix: '10.22541',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0001-5486-5489',
                  'authenticated-orcid': true,
                  given: 'Denis',
                  family: 'Maga\u00f1a-Ortiz',
                  sequence: 'first',
                  affiliation: [{ name: 'Tecnologico Nacional de Mexico' }],
                },
                {
                  given: 'Laura M.',
                  family: 'L\u00f3pez-Castillo',
                  sequence: 'additional',
                  affiliation: [{ name: 'Tecnologico de Monterrey' }],
                },
                {
                  given: 'Roberto',
                  family: 'Amezquita-Novelo',
                  sequence: 'additional',
                  affiliation: [{ name: 'Tecnol\u00f3gico Nacional de M\u00e9xico' }],
                },
              ],
              member: '9829',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2023, 8, 10]],
                'date-time': '2023-08-10T18:00:57Z',
                timestamp: 1691690457000,
              },
              score: 1,
              resource: {
                primary: {
                  URL: 'https://www.authorea.com/users/651476/articles/659423-white-rot-fungus-phlebia-floridensis-itm-12-laccase-production-oxidoreductase-profile-and-hydrogen-peroxide-independent-activity?commit=822196b64f79bb40d271b2ace640b0711bdb22d4',
                },
              },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2023, 8, 10]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.22541/au.169169045.52478811/v1',
              relation: {},
              published: { 'date-parts': [[2023, 8, 10]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprintFromCrossref(id)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.stringContaining('<p>Phlebia genus is a relevant group of fungi'),
            },
            authors: [
              { name: 'Denis Magaña-Ortiz', orcid: '0000-0001-5486-5489' },
              { name: 'Laura M. López-Castillo', orcid: undefined },
              { name: 'Roberto Amezquita-Novelo', orcid: undefined },
            ],
            id,
            posted,
            title: {
              language: 'en',
              text: rawHtml(
                'White-rot fungus Phlebia floridensis ITM 12: laccase production, oxidoreductase profile and hydrogen-peroxide independent activity.',
              ),
            },
            url: new URL(
              'https://www.authorea.com/users/651476/articles/659423-white-rot-fungus-phlebia-floridensis-itm-12-laccase-production-oxidoreductase-profile-and-hydrogen-peroxide-independent-activity?commit=822196b64f79bb40d271b2ace640b0711bdb22d4',
            ),
          }),
        )
      })
    })

    test.prop([fc.chemrxivPreprintId(), fc.plainDate()])('from ChemRxiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2023, 1, 19]], 'date-time': '2023-01-19T06:07:15Z', timestamp: 1674108435123 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'Chemistry',
            'reference-count': 0,
            publisher: 'American Chemical Society (ACS)',
            license: [
              {
                start: { 'date-parts': [[2023, 1, 18]], 'date-time': '2023-01-18T00:00:00Z', timestamp: 1674000000000 },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0/',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2023, 1, 17]] },
            abstract:
              '<jats:p>ChemRxiv was launched on August 15, 2017 to provide researchers in chemistry and related fields a home for the immediate sharing of their latest research. In the past five years, ChemRxiv has grown into the premier preprint server for the chemical sciences, with a global audience and a wide array of scholarly content that helps advance science more rapidly. On the service\u2019s fifth anniversary, we would like to reflect on the past five years and take a look at what is next for ChemRxiv.</jats:p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2023, 1, 18]], 'date-time': '2023-01-18T15:15:03Z', timestamp: 1674054903000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Five Years of ChemRxiv: Where We Are and Where We Go From Here'],
            prefix: '10.26434',
            author: [
              {
                ORCID: 'http://orcid.org/0000-0002-2805-5690',
                'authenticated-orcid': false,
                given: 'Benjamin',
                family: 'Mudrak',
                sequence: 'first',
                affiliation: [{ name: 'ChemRxiv' }],
              },
              {
                given: 'Sara',
                family: 'Bosshart',
                sequence: 'additional',
                affiliation: [{ name: 'Royal Society of Chemistry' }],
              },
              {
                given: 'Wolfram',
                family: 'Koch',
                sequence: 'additional',
                affiliation: [{ name: 'Gesellschaft Deutscher Chemiker' }],
              },
              {
                given: 'Allison',
                family: 'Leung',
                sequence: 'additional',
                affiliation: [{ name: 'American Chemical Society' }],
              },
              {
                given: 'Donna',
                family: 'Minton',
                sequence: 'additional',
                affiliation: [{ name: 'Chinese Chemical Society' }],
              },
              {
                given: 'Mitsuo',
                family: 'Sawamoto',
                sequence: 'additional',
                affiliation: [{ name: 'Chemical Society of Japan' }],
              },
              {
                given: 'Sarah',
                family: 'Tegen',
                sequence: 'additional',
                affiliation: [{ name: 'American Chemical Society' }],
              },
            ],
            member: '316',
            'container-title': [],
            'original-title': [],
            link: [
              {
                URL: 'https://chemrxiv.org/engage/api-gateway/chemrxiv/assets/orp/resource/item/63c6eb6f5ab313638caace49/original/five-years-of-chem-rxiv-where-we-are-and-where-we-go-from-here.pdf',
                'content-type': 'unspecified',
                'content-version': 'vor',
                'intended-application': 'similarity-checking',
              },
            ],
            deposited: { 'date-parts': [[2023, 1, 18]], 'date-time': '2023-01-18T15:15:04Z', timestamp: 1674054904000 },
            score: 1,
            resource: {
              primary: { URL: 'https://chemrxiv.org/engage/chemrxiv/article-details/63c6eb6f5ab313638caace49' },
            },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2023, 1, 18]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.26434/chemrxiv-2022-w0jzh-v2',
            relation: {
              'is-version-of': [{ 'id-type': 'doi', id: '10.26434/chemrxiv-2022-w0jzh', 'asserted-by': 'subject' }],
            },
            published: { 'date-parts': [[2023, 1, 18]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>ChemRxiv was launched on August 15, 2017 to provide researchers in chemistry and related fields a home for the immediate sharing of their latest research. In the past five years, ChemRxiv has grown into the premier preprint server for the chemical sciences, with a global audience and a wide array of scholarly content that helps advance science more rapidly. On the service\u2019s fifth anniversary, we would like to reflect on the past five years and take a look at what is next for ChemRxiv.</p>',
            ),
          },
          authors: [
            { name: 'Benjamin Mudrak', orcid: '0000-0002-2805-5690' },
            { name: 'Sara Bosshart', orcid: undefined },
            { name: 'Wolfram Koch', orcid: undefined },
            { name: 'Allison Leung', orcid: undefined },
            { name: 'Donna Minton', orcid: undefined },
            { name: 'Mitsuo Sawamoto', orcid: undefined },
            { name: 'Sarah Tegen', orcid: undefined },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('Five Years of ChemRxiv: Where We Are and Where We Go From Here'),
          },
          url: new URL('https://chemrxiv.org/engage/chemrxiv/article-details/63c6eb6f5ab313638caace49'),
        }),
      )
    })

    test.prop([fc.curvenotePreprintId(), fc.plainDate()])('from Curvenote', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2024, 6, 27]], 'date-time': '2024-06-27T05:57:35Z', timestamp: 1719467855968 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'reference-count': 0,
            publisher: 'Curvenote Inc.',
            license: [
              {
                start: { 'date-parts': [[2024, 5, 11]], 'date-time': '2024-05-11T00:00:00Z', timestamp: 1715385600000 },
                'content-version': 'vor',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0/',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<jats:p>The ability to build upon existing knowledge is fundamental to the process of\n          science. Yet, despite the rapid advancement of science, the methods for citing and\n          referencing content have remained surprisingly static. Today, we\u2019re on the brink of\n          transforming how we interact with scientific literature and educational content. The\n          Curvenote team has been working in the MyST Markdown ecosystem to simplify the ways to\n          reference and embed figures directly into publications. We are starting this process by\n          integrating a <jats:ext-link xmlns:xlink="http://www.w3.org/1999/xlink" ext-link-type="uri" xlink:href="https://mystmd.org/guide/external-references#tbl-syntax-xref">simple\n            markdown syntax for hover-references</jats:ext-link>, which aims to not only streamline\n          referencing academic citations but also enhance the readability and interactive capacity\n          of scholarly articles. This blog post explores the importance of scientific reuse, as the\n          driving FAIR principle, and introduces new tools to reshape how knowledge is reused,\n          shared, and improved in the scientific community.</jats:p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2024, 6, 26]], 'date-time': '2024-06-26T22:53:58Z', timestamp: 1719442438000 },
            source: 'Crossref',
            'is-referenced-by-count': 1,
            title: ['Embracing Reuse in Scientific Communication'],
            prefix: '10.62329',
            author: [
              {
                ORCID: 'http://orcid.org/0000-0002-7859-8394',
                'authenticated-orcid': false,
                given: 'Rowan',
                family: 'Cockett',
                sequence: 'first',
                affiliation: [
                  {
                    id: [{ id: 'https://ror.org/02mz0e468', 'id-type': 'ROR', 'asserted-by': 'publisher' }],
                    name: 'Curvenote Inc.',
                  },
                  { name: 'Executable Books' },
                ],
              },
            ],
            member: '48717',
            'container-title': [],
            'original-title': [],
            deposited: { 'date-parts': [[2024, 6, 26]], 'date-time': '2024-06-26T22:53:58Z', timestamp: 1719442438000 },
            score: 1,
            resource: { primary: { URL: 'https://doi.curvenote.com/10.62329/FMDW8234' } },
            subtitle: ['Introducing MyST based tools for easily reusing scientific content'],
            'short-title': [],
            issued: { 'date-parts': [[2024, 5, 11]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.62329/fmdw8234',
            relation: {},
            subject: [],
            published: { 'date-parts': [[2024, 5, 11]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: expect.stringContaining('<p>The ability to build upon'),
          },
          authors: [{ name: 'Rowan Cockett', orcid: '0000-0002-7859-8394' }],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('Embracing Reuse in Scientific Communication'),
          },
          url: new URL('https://doi.curvenote.com/10.62329/FMDW8234'),
        }),
      )
    })

    test.prop([fc.eartharxivPreprintId(), fc.plainDate()])('from EarthArXiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: {
              'date-parts': [[2022, 10, 27]],
              'date-time': '2022-10-27T05:10:07Z',
              timestamp: 1666847407391,
            },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'Applied Statistics',
            'reference-count': 0,
            publisher: 'California Digital Library (CDL)',
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2022, 10, 24]] },
            abstract:
              '<jats:p>For many applications in environmental remote sensing, the interpretation of a given measurement depends strongly on what time of year the measurement was taken. This is particularly the case for phenology studies concerned with identifying when plant developmental transitions occur, but it is also true for a wide range of applications including vegetation species classification, crop yield estimation, and more. This study explores the use of Fisher Discriminant Analysis (FDA) as a method for extracting time-resolved information from multivariate environmental time series data. FDA is useful because it can be applied to multivariate input data and, for phenological estimation problems, produces a transformation that is physically interpretable. This work contains both theoretical and applied components. First, we use FDA to demonstrate the time-resolved nature of phenological information. Where curve-fitting and other commonly used data transformations that are sensitive to variation throughout a full time series, we show how FDA identifies application-relevant variation in specific variables at specific points in time. Next, we apply FDA to estimate county-average corn planting dates in the United States corn belt. We find that using multivariate data inputs can reduce prediction RMSE (in days) by 20% relative to models using only univariate inputs. We also compare FDA (which is linear) to nonlinear planting date estimation models based on curve-fitting and random forest estimators. We find that multivariate FDA models significantly improve on univariate curve-fitting and have comparable performance when using the same univariate inputs (despite the linearity of FDA). We also find that FDA-based approaches have lower RMSE than random forest in all configurations. Finally, we interpret FDA coefficients for individual measurements sensitive to vegetation density, land surface temperature, and soil moisture by relating them to physical mechanisms indicative of earlier or later planting.</jats:p>',
            DOI: id.value,
            type: 'posted-content',
            created: {
              'date-parts': [[2022, 10, 24]],
              'date-time': '2022-10-24T08:06:26Z',
              timestamp: 1666598786000,
            },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: [
              'Fisher Discriminant Analysis for Extracting Interpretable Phenological Information from Multivariate Time Series Data',
            ],
            prefix: '10.31223',
            author: [
              {
                ORCID: 'http://orcid.org/0000-0003-2637-0029',
                'authenticated-orcid': false,
                given: 'Conor',
                family: 'Doherty',
                sequence: 'first',
                affiliation: [],
              },
              { given: 'Meagan', family: 'Mauter', sequence: 'additional', affiliation: [] },
            ],
            member: '29705',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2022, 10, 26]],
              'date-time': '2022-10-26T08:00:49Z',
              timestamp: 1666771249000,
            },
            score: 1,
            resource: { primary: { URL: 'http://eartharxiv.org/repository/view/4603/' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2022, 10, 26]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31223/x5h94p',
            relation: {},
            published: { 'date-parts': [[2022, 10, 26]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>For many applications in environmental remote sensing, the interpretation of a given measurement depends strongly on what time of year the measurement was taken. This is particularly the case for phenology studies concerned with identifying when plant developmental transitions occur, but it is also true for a wide range of applications including vegetation species classification, crop yield estimation, and more. This study explores the use of Fisher Discriminant Analysis (FDA) as a method for extracting time-resolved information from multivariate environmental time series data. FDA is useful because it can be applied to multivariate input data and, for phenological estimation problems, produces a transformation that is physically interpretable. This work contains both theoretical and applied components. First, we use FDA to demonstrate the time-resolved nature of phenological information. Where curve-fitting and other commonly used data transformations that are sensitive to variation throughout a full time series, we show how FDA identifies application-relevant variation in specific variables at specific points in time. Next, we apply FDA to estimate county-average corn planting dates in the United States corn belt. We find that using multivariate data inputs can reduce prediction RMSE (in days) by 20% relative to models using only univariate inputs. We also compare FDA (which is linear) to nonlinear planting date estimation models based on curve-fitting and random forest estimators. We find that multivariate FDA models significantly improve on univariate curve-fitting and have comparable performance when using the same univariate inputs (despite the linearity of FDA). We also find that FDA-based approaches have lower RMSE than random forest in all configurations. Finally, we interpret FDA coefficients for individual measurements sensitive to vegetation density, land surface temperature, and soil moisture by relating them to physical mechanisms indicative of earlier or later planting.</p>',
            ),
          },
          authors: [
            {
              name: 'Conor Doherty',
              orcid: '0000-0003-2637-0029',
            },
            {
              name: 'Meagan Mauter',
              orcid: undefined,
            },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml(
              'Fisher Discriminant Analysis for Extracting Interpretable Phenological Information from Multivariate Time Series Data',
            ),
          },
          url: new URL('https://eartharxiv.org/repository/view/4603/'),
        }),
      )
    })

    test.prop([fc.ecoevorxivPreprintId(), fc.plainDate()])('from EcoEvoRxiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2023, 1, 24]], 'date-time': '2023-01-24T06:04:29Z', timestamp: 1674540269185 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'Ecology and Evolutionary Biology',
            'reference-count': 0,
            publisher: 'California Digital Library (CDL)',
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2023, 1, 23]] },
            abstract:
              '<jats:p>Coral reefs are under threat from disease as climate change alters environmental conditions. Rising temperatures exacerbate coral disease, but this relationship is likely complex as other factors also influence coral disease prevalence. To better understand this relationship, we meta-analytically examined 108 studies for changes in global coral disease over time alongside temperature, expressed using average summer sea surface temperature (SST) and cumulative heat stress as weekly sea surface temperature anomalies (WSSTAs). We found both rising average summer SST and WSSTA were associated with global increases in the mean and variability in coral disease prevalence. We showed global coral disease prevalence reached 9.92% compared to 3.16% in 1992, and the effect of \u2018year\u2019 became more stable (i.e., has lower variance), contrasting to the effects of the two temperature stressors. Regional patterns diverged over time and differed in response to average summer SST. Our model predicted that, under the same trajectory, 76.8% of corals would be diseased globally by 2100, even assuming moderate average summer SST and WSSTA. These results highlight the need for urgent action to mitigate coral disease. Mitigating the impact of rising ocean temperatures on coral disease alone is a complex challenge requiring global discussion and further study.</jats:p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2023, 1, 23]], 'date-time': '2023-01-23T19:52:56Z', timestamp: 1674503576000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: [
              'The impact of rising temperatures on the prevalence of coral diseases and its predictability: a global meta-analysis',
            ],
            prefix: '10.32942',
            author: [
              { given: 'Samantha', family: 'Burke', sequence: 'first', affiliation: [] },
              { given: 'Patrice', family: 'Pottier', sequence: 'additional', affiliation: [] },
              { given: 'Malgorzata', family: 'Lagisz', sequence: 'additional', affiliation: [] },
              { given: 'Erin', family: 'Macartney', sequence: 'additional', affiliation: [] },
              { given: 'Tracy', family: 'Ainsworth', sequence: 'additional', affiliation: [] },
              {
                ORCID: 'http://orcid.org/0000-0001-8101-6247',
                'authenticated-orcid': false,
                given: 'Szymon',
                family: 'Drobniak',
                sequence: 'additional',
                affiliation: [],
              },
              { given: 'Shinichi', family: 'Nakagawa', sequence: 'additional', affiliation: [] },
            ],
            member: '29705',
            'container-title': [],
            'original-title': [],
            deposited: { 'date-parts': [[2023, 1, 23]], 'date-time': '2023-01-23T19:52:56Z', timestamp: 1674503576000 },
            score: 1,
            resource: { primary: { URL: 'https://ecoevorxiv.org/repository/view/4833/' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2023, 1, 23]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.32942/x2hp4p',
            relation: {},
            published: { 'date-parts': [[2023, 1, 23]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>Coral reefs are under threat from disease as climate change alters environmental conditions. Rising temperatures exacerbate coral disease, but this relationship is likely complex as other factors also influence coral disease prevalence. To better understand this relationship, we meta-analytically examined 108 studies for changes in global coral disease over time alongside temperature, expressed using average summer sea surface temperature (SST) and cumulative heat stress as weekly sea surface temperature anomalies (WSSTAs). We found both rising average summer SST and WSSTA were associated with global increases in the mean and variability in coral disease prevalence. We showed global coral disease prevalence reached 9.92% compared to 3.16% in 1992, and the effect of \u2018year\u2019 became more stable (i.e., has lower variance), contrasting to the effects of the two temperature stressors. Regional patterns diverged over time and differed in response to average summer SST. Our model predicted that, under the same trajectory, 76.8% of corals would be diseased globally by 2100, even assuming moderate average summer SST and WSSTA. These results highlight the need for urgent action to mitigate coral disease. Mitigating the impact of rising ocean temperatures on coral disease alone is a complex challenge requiring global discussion and further study.</p>',
            ),
          },
          authors: [
            { name: 'Samantha Burke', orcid: undefined },
            { name: 'Patrice Pottier', orcid: undefined },
            { name: 'Malgorzata Lagisz', orcid: undefined },
            { name: 'Erin Macartney', orcid: undefined },
            { name: 'Tracy Ainsworth', orcid: undefined },
            { name: 'Szymon Drobniak', orcid: '0000-0001-8101-6247' },
            { name: 'Shinichi Nakagawa', orcid: undefined },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml(
              'The impact of rising temperatures on the prevalence of coral diseases and its predictability: a global meta-analysis',
            ),
          },
          url: new URL('https://ecoevorxiv.org/repository/view/4833/'),
        }),
      )
    })

    test.prop([fc.edarxivPreprintId(), fc.plainDate()])('from EdArXiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2022, 8, 31]], 'date-time': '2022-08-31T01:11:09Z', timestamp: 1661908269867 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'EdArXiv',
            'reference-count': 0,
            publisher: 'Center for Open Science',
            license: [
              {
                start: {
                  'date-parts': [[2022, 5, 16]],
                  'date-time': '2022-05-16T00:00:00Z',
                  timestamp: 1652659200000,
                },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0/legalcode',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<p>Einer ihrer Kernt\u00e4tigkeiten nachkommend, erarbeiten Hochschuldozierende jedesSemester unter Einsatz personeller, zeitlicher und finanzieller Ressourcen eineVielzahl an Lehrkonzepten und Lehr-/Lernmaterialien. Lehrbezogenem Wissensmanagement, d. h. der systematischen, effizienten und nachhaltigen Nutzung von Wissen im Kontext Lehre, wird bis dato h\u00e4ufig wenig Bedeutung beigemessen. Das \u00fcbergreifende Ziel bestand deshalb darin, ein theoriebasiertes und praktikables Reflexionsinstrument zu entwickeln, das es Dozierenden erm\u00f6glicht, ihr p\u00e4dagogisches Arbeitshandeln respektive ihren Umgang mit lehrbezogenem Wissen aus einer wissensmanagementtheoretischen Perspektive in den Blick zu nehmen. In diesem Beitrag beschreiben wir die theoretische Fundierung, die Entwicklung, den Aufbau und wesentliche Einsatzm\u00f6glichkeiten des Instruments (LeWiMa). Es soll Dozierenden dabei helfen, ihr lehrbezogenes Wissensmanagement systematisch zu reflektieren, etwaige  Verbesserungspotenziale, Kompetenz- und Fortbildungsbedarfe zu erkennen und bedarfsorientierte Ma\u00dfnahmen zu ergreifen, durch die sie ihre Lehre mittel- und langfristig effizienter, systematischer, offener und nachhaltiger gestalten k\u00f6nnen.</p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2022, 5, 16]], 'date-time': '2022-05-16T15:52:23Z', timestamp: 1652716343000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: [
              'Lehrbezogenes Wissensmanagement in der Hochschullehre: Entwicklung, Beschreibung und Einsatzm\u00f6glichkeiten des Reflexionsinstruments LeWiMa',
            ],
            prefix: '10.35542',
            author: [
              {
                ORCID: 'http://orcid.org/0000-0002-7065-1306',
                'authenticated-orcid': true,
                given: 'Stefan T.',
                family: 'Siegel',
                sequence: 'first',
                affiliation: [],
              },
              { given: 'Astrid', family: 'Krummenauer-Grasser', sequence: 'additional', affiliation: [] },
              { given: 'Christine', family: 'Stahl', sequence: 'additional', affiliation: [] },
            ],
            member: '15934',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2022, 8, 31]],
              'date-time': '2022-08-31T00:29:16Z',
              timestamp: 1661905756000,
            },
            score: 1,
            resource: { primary: { URL: 'https://osf.io/dqw5h' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2022, 5, 16]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.35542/osf.io/dqw5h',
            relation: {},
            published: { 'date-parts': [[2022, 5, 16]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'de',
            text: rawHtml(
              '<p>Einer ihrer Kerntätigkeiten nachkommend, erarbeiten Hochschuldozierende jedesSemester unter Einsatz personeller, zeitlicher und finanzieller Ressourcen eineVielzahl an Lehrkonzepten und Lehr-/Lernmaterialien. Lehrbezogenem Wissensmanagement, d. h. der systematischen, effizienten und nachhaltigen Nutzung von Wissen im Kontext Lehre, wird bis dato häufig wenig Bedeutung beigemessen. Das übergreifende Ziel bestand deshalb darin, ein theoriebasiertes und praktikables Reflexionsinstrument zu entwickeln, das es Dozierenden ermöglicht, ihr pädagogisches Arbeitshandeln respektive ihren Umgang mit lehrbezogenem Wissen aus einer wissensmanagementtheoretischen Perspektive in den Blick zu nehmen. In diesem Beitrag beschreiben wir die theoretische Fundierung, die Entwicklung, den Aufbau und wesentliche Einsatzmöglichkeiten des Instruments (LeWiMa). Es soll Dozierenden dabei helfen, ihr lehrbezogenes Wissensmanagement systematisch zu reflektieren, etwaige  Verbesserungspotenziale, Kompetenz- und Fortbildungsbedarfe zu erkennen und bedarfsorientierte Maßnahmen zu ergreifen, durch die sie ihre Lehre mittel- und langfristig effizienter, systematischer, offener und nachhaltiger gestalten können.</p>',
            ),
          },
          authors: [
            {
              name: 'Stefan T. Siegel',
              orcid: '0000-0002-7065-1306',
            },
            {
              name: 'Astrid Krummenauer-Grasser',
              orcid: undefined,
            },
            {
              name: 'Christine Stahl',
              orcid: undefined,
            },
          ],
          id,
          posted,
          title: {
            language: 'de',
            text: rawHtml(
              'Lehrbezogenes Wissensmanagement in der Hochschullehre: Entwicklung, Beschreibung und Einsatzmöglichkeiten des Reflexionsinstruments LeWiMa',
            ),
          },
          url: new URL('https://osf.io/dqw5h'),
        }),
      )
    })

    test.prop([fc.engrxivPreprintId(), fc.plainDate()])('from engrXiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: {
              'date-parts': [[2022, 10, 21]],
              'date-time': '2022-10-21T05:34:45Z',
              timestamp: 1666330485379,
            },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'reference-count': 0,
            publisher: 'Open Engineering Inc',
            license: [
              {
                start: {
                  'date-parts': [[2022, 10, 20]],
                  'date-time': '2022-10-20T00:00:00Z',
                  timestamp: 1666224000000,
                },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            DOI: id.value,
            type: 'posted-content',
            created: {
              'date-parts': [[2022, 10, 20]],
              'date-time': '2022-10-20T20:55:48Z',
              timestamp: 1666299348000,
            },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Study of FPGA logic reconfiguration during operation'],
            prefix: '10.31224',
            author: [{ given: 'Yoji', family: 'Yamato', sequence: 'first', affiliation: [] }],
            member: '33966',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2022, 10, 20]],
              'date-time': '2022-10-20T20:55:49Z',
              timestamp: 1666299349000,
            },
            score: 1,
            resource: { primary: { URL: 'https://engrxiv.org/preprint/view/2632/version/3806' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2022, 10, 20]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31224/2632',
            relation: {},
            published: { 'date-parts': [[2022, 10, 20]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: undefined,
          authors: [
            {
              name: 'Yoji Yamato',
              orcid: undefined,
            },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('Study of FPGA logic reconfiguration during operation'),
          },
          url: new URL('https://engrxiv.org/preprint/view/2632/version/3806'),
        }),
      )
    })

    test.prop([fc.metaarxivPreprintId(), fc.plainDate()])('from MetaArXiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2022, 8, 30]], 'date-time': '2022-08-30T14:40:20Z', timestamp: 1661870420502 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'MetaArXiv',
            'reference-count': 0,
            publisher: 'Center for Open Science',
            license: [
              {
                start: { 'date-parts': [[2017, 3, 3]], 'date-time': '2017-03-03T00:00:00Z', timestamp: 1488499200000 },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0/legalcode',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<p>There is growing interest in enhancing research transparency and reproducibility in economics and other scientific fields. We survey existing work on these topics within economics, and discuss the evidence suggesting that publication bias, inability to replicate, and specification searching remain widespread in the discipline. We next discuss recent progress in this area, including through improved research design, study registration and pre-analysis plans, disclosure standards, and open sharing of data and materials, drawing on experiences in both economics and other social sciences. We discuss areas where consensus is emerging on new practices, as well as approaches that remain controversial, and speculate about the most effective ways to make economics research more credible in the future.</p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2018, 7, 2]], 'date-time': '2018-07-02T10:45:16Z', timestamp: 1530528316000 },
            source: 'Crossref',
            'is-referenced-by-count': 1,
            title: ['Transparency, Reproducibility, and the Credibility of Economics Research'],
            prefix: '10.31234',
            author: [
              { given: 'Garret', family: 'Christensen', sequence: 'first', affiliation: [] },
              { given: 'Edward', family: 'Miguel', sequence: 'additional', affiliation: [] },
            ],
            member: '15934',
            'container-title': [],
            'original-title': [],
            deposited: { 'date-parts': [[2022, 8, 30]], 'date-time': '2022-08-30T14:00:06Z', timestamp: 1661868006000 },
            score: 1,
            resource: { primary: { URL: 'https://osf.io/9a3rw' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2017, 3, 3]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31222/osf.io/9a3rw',
            relation: {},
            published: { 'date-parts': [[2017, 3, 3]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>There is growing interest in enhancing research transparency and reproducibility in economics and other scientific fields. We survey existing work on these topics within economics, and discuss the evidence suggesting that publication bias, inability to replicate, and specification searching remain widespread in the discipline. We next discuss recent progress in this area, including through improved research design, study registration and pre-analysis plans, disclosure standards, and open sharing of data and materials, drawing on experiences in both economics and other social sciences. We discuss areas where consensus is emerging on new practices, as well as approaches that remain controversial, and speculate about the most effective ways to make economics research more credible in the future.</p>',
            ),
          },
          authors: [
            {
              name: 'Garret Christensen',
              orcid: undefined,
            },
            {
              name: 'Edward Miguel',
              orcid: undefined,
            },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('Transparency, Reproducibility, and the Credibility of Economics Research'),
          },
          url: new URL('https://osf.io/9a3rw'),
        }),
      )
    })

    test.prop([fc.osfPreprintsPreprintId(), fc.plainDate()])('from OSF', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2022, 8, 30]], 'date-time': '2022-08-30T22:12:51Z', timestamp: 1661897571277 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'Open Science Framework',
            'reference-count': 0,
            publisher: 'Center for Open Science',
            license: [
              {
                start: {
                  'date-parts': [[2021, 10, 11]],
                  'date-time': '2021-10-11T00:00:00Z',
                  timestamp: 1633910400000,
                },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<p>This article takes a look at the state of preservation in Hoi An, which is a world heritage and a famous tourist attraction in central Vietnam.</p>',
            DOI: id.value,
            type: 'posted-content',
            created: {
              'date-parts': [[2021, 10, 11]],
              'date-time': '2021-10-11T09:19:19Z',
              timestamp: 1633943959000,
            },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Quy ho\u1ea1ch di s\u1ea3n: M\u1ed9t g\u00f3c nh\u00ecn t\u1eeb H\u1ed9i An'],
            prefix: '10.31219',
            author: [{ given: 'Tran Duc Hung', family: 'Long', sequence: 'first', affiliation: [] }],
            member: '15934',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2022, 8, 30]],
              'date-time': '2022-08-30T21:53:41Z',
              timestamp: 1661896421000,
            },
            score: 1,
            resource: { primary: { URL: 'https://osf.io/t9gbj' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2021, 10, 11]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31219/osf.io/t9gbj',
            relation: {},
            published: { 'date-parts': [[2021, 10, 11]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>This article takes a look at the state of preservation in Hoi An, which is a world heritage and a famous tourist attraction in central Vietnam.</p>',
            ),
          },
          authors: [
            {
              name: 'Tran Duc Hung Long',
              orcid: undefined,
            },
          ],
          id,
          posted,
          title: {
            language: 'vi',
            text: rawHtml('Quy hoạch di sản: Một góc nhìn từ Hội An'),
          },
          url: new URL('https://osf.io/t9gbj'),
        }),
      )
    })

    test.prop([fc.psyarxivPreprintId(), fc.plainDate()])('from PsyArXiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2022, 8, 30]], 'date-time': '2022-08-30T14:12:52Z', timestamp: 1661868772492 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'PsyArXiv',
            'reference-count': 0,
            publisher: 'Center for Open Science',
            license: [
              {
                start: {
                  'date-parts': [[2017, 1, 24]],
                  'date-time': '2017-01-24T00:00:00Z',
                  timestamp: 1485216000000,
                },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<p>We review how often distortions on the cognitive mechanisms underlying the virtuosism of mental athletes, including the frequent link to autistic savants or synesthesia, result from the confusion, misconceptions and even lack of rigor found in scientific literature. We present specific cases were ignorance about the basic training techniques of mental athlete\u2019s world causes serious interpretation and methodological problems. Calculations seem obviously more impressive if they mysteriously pop-out in the air from unexplained virtues of an unexplained brain. The task of cognitive neuroscience is the opposite. It is to find and reveal the trick and seek to unfold which operations (often much more normal than they seem) result in these seemingly extraordinary performances.</p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2018, 7, 2]], 'date-time': '2018-07-02T10:43:11Z', timestamp: 1530528191000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Dazzled by the mystery of mentalism: The cognitive neuroscience of mental athletes'],
            prefix: '10.31219',
            author: [
              { given: 'Andr\u00e9s', family: 'Rieznik', sequence: 'first', affiliation: [] },
              { given: 'Mariano', family: 'Sigman', sequence: 'additional', affiliation: [] },
            ],
            member: '15934',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2022, 8, 30]],
              'date-time': '2022-08-30T13:49:02Z',
              timestamp: 1661867342000,
            },
            score: 1,
            resource: { primary: { URL: 'https://osf.io/23akm' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2017, 1, 24]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31234/osf.io/23akm',
            relation: {},
            published: { 'date-parts': [[2017, 1, 24]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>We review how often distortions on the cognitive mechanisms underlying the virtuosism of mental athletes, including the frequent link to autistic savants or synesthesia, result from the confusion, misconceptions and even lack of rigor found in scientific literature. We present specific cases were ignorance about the basic training techniques of mental athlete\u2019s world causes serious interpretation and methodological problems. Calculations seem obviously more impressive if they mysteriously pop-out in the air from unexplained virtues of an unexplained brain. The task of cognitive neuroscience is the opposite. It is to find and reveal the trick and seek to unfold which operations (often much more normal than they seem) result in these seemingly extraordinary performances.</p>',
            ),
          },
          authors: [
            {
              name: 'Andrés Rieznik',
              orcid: undefined,
            },
            {
              name: 'Mariano Sigman',
              orcid: undefined,
            },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml('Dazzled by the mystery of mentalism: The cognitive neuroscience of mental athletes'),
          },
          url: new URL('https://osf.io/23akm'),
        }),
      )
    })

    test.prop([fc.scienceOpenPreprintId(), fc.plainDate()])('from ScienceOpen', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            institution: [{ name: 'ScienceOpen' }],
            indexed: { 'date-parts': [[2022, 10, 5]], 'date-time': '2022-10-05T06:52:16Z', timestamp: 1664952736356 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'reference-count': 0,
            publisher: 'ScienceOpen',
            license: [
              {
                start: { 'date-parts': [[2022, 9, 27]], 'date-time': '2022-09-27T00:00:00Z', timestamp: 1664236800000 },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'http://creativecommons.org/licenses/by/4.0/',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<jats:p>El presente art\u00edculo esboza algunos aspectos relevantes del punk espa\u00f1ol y sus contextos y provee referencias para un estudio en profundidad.</jats:p>',
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2022, 10, 4]], 'date-time': '2022-10-04T09:00:12Z', timestamp: 1664874012000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Notas para una aproximación al punk español y sus contextos'],
            prefix: '10.14293',
            author: [
              {
                given: 'Fabi\u00e1n',
                family: 'Pavez',
                sequence: 'first',
                affiliation: [
                  {
                    name: '1. The International School of Doctoral Studies. University of Murcia, Spain. 2. Mental Health Center of Lorca. Murcia Health Service, Spain.',
                  },
                ],
              },
              {
                given: 'Pedro',
                family: 'Marset',
                sequence: 'additional',
                affiliation: [{ name: '3. University of Murcia' }],
              },
            ],
            member: '5403',
            'container-title': [],
            'original-title': [],
            link: [
              {
                URL: 'https://scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPL3VEC.v2',
                'content-type': 'unspecified',
                'content-version': 'vor',
                'intended-application': 'similarity-checking',
              },
            ],
            deposited: { 'date-parts': [[2022, 10, 4]], 'date-time': '2022-10-04T09:00:13Z', timestamp: 1664874013000 },
            score: 1,
            resource: {
              primary: { URL: 'https://scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPL3VEC.v2' },
            },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2022, 9, 27]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.14293/s2199-1006.1.sor-.ppl3vec.v2',
            relation: {},
            published: { 'date-parts': [[2022, 9, 27]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'es',
            text: rawHtml(
              '<p>El presente artículo esboza algunos aspectos relevantes del punk español y sus contextos y provee referencias para un estudio en profundidad.</p>',
            ),
          },
          authors: [
            { name: 'Fabián Pavez', orcid: undefined },
            { name: 'Pedro Marset', orcid: undefined },
          ],
          id,
          posted,
          title: {
            language: 'es',
            text: rawHtml('Notas para una aproximación al punk español y sus contextos'),
          },
          url: new URL('https://scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPL3VEC.v2'),
        }),
      )
    })

    test.prop([fc.socarxivPreprintId(), fc.plainDate()])('from SocArXiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: {
              'date-parts': [[2022, 11, 28]],
              'date-time': '2022-11-28T05:27:53Z',
              timestamp: 1669613273003,
            },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'SocArXiv',
            'reference-count': 0,
            publisher: 'Center for Open Science',
            license: [
              {
                start: {
                  'date-parts': [[2022, 11, 26]],
                  'date-time': '2022-11-26T00:00:00Z',
                  timestamp: 1669420800000,
                },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by/4.0/legalcode',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            abstract:
              '<p>The restitution of a S\u00e1mi drum confiscated in 1691 in Karasjok, present-day  Norway, was made in early 2022. This good incorporates historical meaning, culture and own values as well as marks of colonization and inequalities in S\u00e1pmi. It can talk about the long coloniality and racist invisibilization in the far north of Europe and about the historical resistances and current processes for justice andreparation. A bibliographical synthesis is presented on the Eurocentric invention of races operated from the center of Europe in which it aimed particularly at the S\u00e1mi populations, their lands and cultures, with colonial, patriarchal and capacitist demarcations. Possible lines of intervention and reconfiguration of the work on biographical and bibliographical sources that sustain, encourage anddisseminate the incorporation of knowledge inherited and to be passed on by originary cultures with recognition and justice.</p>',
            DOI: id.value,
            type: 'posted-content',
            created: {
              'date-parts': [[2022, 11, 27]],
              'date-time': '2022-11-27T05:00:33Z',
              timestamp: 1669525233000,
            },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: [
              'Um tambor s\u00e1mi restitu\u00eddo: culturas origin\u00e1rias europeias e colonialismo no \u00c1rtico',
            ],
            prefix: '10.31235',
            author: [
              {
                ORCID: 'http://orcid.org/0000-0003-2069-5631',
                'authenticated-orcid': true,
                given: 'Paula',
                family: 'Sequeiros',
                sequence: 'first',
                affiliation: [],
              },
            ],
            member: '15934',
            'container-title': [],
            'original-title': [],
            deposited: {
              'date-parts': [[2022, 11, 27]],
              'date-time': '2022-11-27T05:00:34Z',
              timestamp: 1669525234000,
            },
            score: 1,
            resource: { primary: { URL: 'https://osf.io/ny6h2' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2022, 11, 26]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.31235/osf.io/ny6h2',
            relation: {},
            published: { 'date-parts': [[2022, 11, 26]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: rawHtml(
              '<p>The restitution of a Sámi drum confiscated in 1691 in Karasjok, present-day  Norway, was made in early 2022. This good incorporates historical meaning, culture and own values as well as marks of colonization and inequalities in Sápmi. It can talk about the long coloniality and racist invisibilization in the far north of Europe and about the historical resistances and current processes for justice andreparation. A bibliographical synthesis is presented on the Eurocentric invention of races operated from the center of Europe in which it aimed particularly at the Sámi populations, their lands and cultures, with colonial, patriarchal and capacitist demarcations. Possible lines of intervention and reconfiguration of the work on biographical and bibliographical sources that sustain, encourage anddisseminate the incorporation of knowledge inherited and to be passed on by originary cultures with recognition and justice.</p>',
            ),
          },
          authors: [
            {
              name: 'Paula Sequeiros',
              orcid: '0000-0003-2069-5631',
            },
          ],
          id,
          posted,
          title: {
            language: 'pt',
            text: rawHtml('Um tambor sámi restituído: culturas originárias europeias e colonialismo no Ártico'),
          },
          url: new URL('https://osf.io/ny6h2'),
        }),
      )
    })

    test.prop([fc.techrxivPreprintId(), fc.plainDate()])('from TechRxiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            institution: [{ name: 'Authorea, Inc.' }],
            indexed: { 'date-parts': [[2024, 2, 15]], 'date-time': '2024-02-15T00:45:09Z', timestamp: 1707957909760 },
            posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            'group-title': 'Preprints',
            'reference-count': 0,
            publisher: 'Institute of Electrical and Electronics Engineers (IEEE)',
            license: [
              {
                start: { 'date-parts': [[2024, 2, 14]], 'date-time': '2024-02-14T00:00:00Z', timestamp: 1707868800000 },
                'content-version': 'unspecified',
                'delay-in-days': 0,
                URL: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
              },
            ],
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2024, 2, 14]] },
            DOI: id.value,
            type: 'posted-content',
            created: { 'date-parts': [[2024, 2, 14]], 'date-time': '2024-02-14T19:52:51Z', timestamp: 1707940371000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: [
              'Maximum Likelihood Estimation of State Variables and Line Parameters in Distribution Grid with a Non-Linear Model',
            ],
            prefix: '10.36227',
            author: [
              {
                ORCID: 'http://orcid.org/0009-0002-1293-2377',
                'authenticated-orcid': true,
                given: 'Shubhankar',
                family: 'Kapoor',
                sequence: 'first',
                affiliation: [],
              },
              { given: 'Adrian G', family: 'Wills', sequence: 'additional', affiliation: [] },
              { given: 'Johannes', family: 'Hendriks', sequence: 'additional', affiliation: [] },
              { given: 'Lachlan', family: 'Blackhall', sequence: 'additional', affiliation: [] },
            ],
            member: '263',
            'container-title': [],
            'original-title': [],
            deposited: { 'date-parts': [[2024, 2, 14]], 'date-time': '2024-02-14T19:52:51Z', timestamp: 1707940371000 },
            score: 1,
            resource: {
              primary: {
                URL: 'https://www.techrxiv.org/users/742533/articles/717019-maximum-likelihood-estimation-of-state-variables-and-line-parameters-in-distribution-grid-with-a-non-linear-model?commit=5545b39f226ecbb6a796058e63464f5b4772a78d',
              },
            },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2024, 2, 14]] },
            'references-count': 0,
            URL: 'http://dx.doi.org/10.36227/techrxiv.170794036.66542348/v1',
            relation: {},
            published: { 'date-parts': [[2024, 2, 14]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: undefined,
          authors: [
            { name: 'Shubhankar Kapoor', orcid: '0009-0002-1293-2377' },
            { name: 'Adrian G Wills', orcid: undefined },
            { name: 'Johannes Hendriks', orcid: undefined },
            { name: 'Lachlan Blackhall', orcid: undefined },
          ],
          id,
          posted,
          title: {
            language: 'en',
            text: rawHtml(
              'Maximum Likelihood Estimation of State Variables and Line Parameters in Distribution Grid with a Non-Linear Model',
            ),
          },
          url: new URL(
            'https://www.techrxiv.org/users/742533/articles/717019-maximum-likelihood-estimation-of-state-variables-and-line-parameters-in-distribution-grid-with-a-non-linear-model?commit=5545b39f226ecbb6a796058e63464f5b4772a78d',
          ),
        }),
      )
    })
  })

  test.prop([fc.legacyCrossrefPreprintId()])('when the preprint is not found', async id => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, { status: Status.NotFound })

    const actual = await _.getPreprintFromCrossref(id)({ fetch })()

    expect(actual).toStrictEqual(E.left(new PreprintIsNotFound({})))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.legacyCrossrefPreprintId(),
    fc.record(
      {
        author: fc.array(fc.record({ name: fc.string() })),
        created: fc.record({
          'date-parts': fc.tuple(
            fc.oneof(
              fc.year().map(year => [year]),
              fc.plainYearMonth().map(time => [time.year, time.month]),
              fc.plainDate().map(time => [time.year, time.month, time.day]),
            ),
          ),
        }),
        DOI: fc.crossrefPreprintDoi(),
        institution: fc.array(fc.record({ name: fc.string() })),
        license: fc.array(
          fc.record({
            start: fc.record({
              'date-parts': fc.tuple(
                fc.oneof(
                  fc.year().map(year => [year]),
                  fc.plainYearMonth().map(time => [time.year, time.month]),
                  fc.plainDate().map(time => [time.year, time.month, time.day]),
                ),
              ),
            }),
            URL: fc.webUrl(),
          }),
        ),
        published: fc.record({
          'date-parts': fc.tuple(
            fc.oneof(
              fc.year().map(year => [year]),
              fc.plainYearMonth().map(time => [time.year, time.month]),
              fc.plainDate().map(time => [time.year, time.month, time.day]),
            ),
          ),
        }),
        publisher: fc.string(),
        resource: fc.record({
          primary: fc.record({
            URL: fc.webUrl(),
          }),
        }),
        subtype: fc.string(),
        title: fc.array(fc.string()),
        type: fc.string(),
      },
      {
        requiredKeys: ['author', 'created', 'DOI', 'institution', 'license', 'publisher', 'resource', 'title', 'type'],
      },
    ),
  ])('when the DOI is not for a preprint', async (id, work) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, { body: { message: work } })

    const actual = await _.getPreprintFromCrossref(id)({ fetch })()

    expect(actual).toStrictEqual(E.left(new NotAPreprint({})))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.legacyCrossrefPreprintId(), fc.record({ status: fc.integer(), body: fc.string() })])(
    'when the preprint cannot be loaded',
    async (id, response) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, response)

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(E.left(new PreprintIsUnavailable({})))
      expect(fetch.done()).toBeTruthy()
    },
  )
})
