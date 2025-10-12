import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import { rawHtml } from '../../../src/html.ts'
import * as _ from '../../../src/Preprints/Crossref/legacy-crossref.ts'
import { NotAPreprint, PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as fc from '../../fc.ts'

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
            posted: { 'date-parts': [[2024, 8, 20]] },
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
            published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
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
              posted: { 'date-parts': [[2023, 8, 8]] },
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
              published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprintFromCrossref(id)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.htmlContaining('<p>Some properties of the Dawson Integral are presented first'),
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
              posted: { 'date-parts': [[2023, 8, 10]] },
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
              published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprintFromCrossref(id)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.htmlContaining('<p>Phlebia genus is a relevant group of fungi'),
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

    test.prop([fc.curvenotePreprintId(), fc.plainDate()])('from Curvenote', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            indexed: { 'date-parts': [[2024, 6, 27]], 'date-time': '2024-06-27T05:57:35Z', timestamp: 1719467855968 },
            posted: { 'date-parts': [[2024, 5, 11]] },
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
            published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
            subtype: 'preprint',
          },
        },
      })

      const actual = await _.getPreprintFromCrossref(id)({ fetch })()

      expect(actual).toStrictEqual(
        E.right({
          abstract: {
            language: 'en',
            text: expect.htmlContaining('<p>The ability to build upon'),
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
            posted: { 'date-parts': [[2022, 10, 26]] },
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
            published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
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
            posted: { 'date-parts': [[2023, 1, 23]] },
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
            published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
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
            posted: { 'date-parts': [[2022, 10, 20]] },
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
            published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
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

    test.prop([fc.techrxivPreprintId(), fc.plainDate()])('from TechRxiv', async (id, posted) => {
      const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            institution: [{ name: 'Authorea, Inc.' }],
            indexed: { 'date-parts': [[2024, 2, 15]], 'date-time': '2024-02-15T00:45:09Z', timestamp: 1707957909760 },
            posted: { 'date-parts': [[2024, 2, 14]] },
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
            published: { 'date-parts': [[posted.year, posted.month, posted.day]] },
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
      .getOnce(`https://api.crossref.org/works/${encodeURIComponent(id.value)}`, { status: StatusCodes.NotFound })

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
