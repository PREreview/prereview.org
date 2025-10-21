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
