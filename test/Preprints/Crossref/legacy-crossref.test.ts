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
