import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Either } from 'effect'
import { JapanLinkCenter } from '../../../src/ExternalApis/index.js'
import { rawHtml } from '../../../src/html.js'
import { Preprint } from '../../../src/preprint.js'
import * as _ from '../../../src/Preprints/JapanLinkCenter/Preprint.js'
import { JxivPreprintId } from '../../../src/types/preprint-id.js'
import * as fc from '../../fc.js'

describe('recordToPreprint', () => {
  test('can be transformed', () => {
    const actual = Either.getOrThrow(_.recordToPreprint(stubRecord))

    expect(actual).toStrictEqual(
      Preprint({
        authors: [
          { name: 'Noriko Shiomitsu', orcid: undefined },
          { name: 'Miwako Honma', orcid: undefined },
          { name: 'Keiko Yamada', orcid: undefined },
        ],
        id: new JxivPreprintId({ value: Doi('10.51094/jxiv.1041') }),
        posted: Temporal.PlainDate.from('2025-01-28'),
        title: {
          language: 'en',
          text: rawHtml(
            'Transitions and Future Challenges in Gender Equality and Science, Technology and Innovation Policies Targeting Women Researchers',
          ),
        },
        url: new URL('https://doi.org/10.51094/jxiv.1041'),
      }),
    )
  })

  test.prop([fc.constantFrom('JA', 'BK', 'RD', 'EL')])('not a preprint', contentType => {
    const record = new JapanLinkCenter.Record({
      ...stubRecord,
      content_type: contentType,
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('NotAPreprint')
    expect(actual.cause).toStrictEqual(contentType)
  })

  test.prop([fc.nonPreprintDoi()])('not a Japan Link Center preprint ID', doi => {
    const record = new JapanLinkCenter.Record({
      ...stubRecord,
      doi,
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual(doi)
  })
})

const stubRecord = {
  content_type: 'GD',
  doi: Doi('10.51094/jxiv.1041'),
  url: new URL('https://doi.org/10.51094/jxiv.1041'),
  title_list: [
    {
      lang: 'en',
      title:
        'Transitions and Future Challenges in Gender Equality and Science, Technology and Innovation Policies Targeting Women Researchers',
    },
    {
      lang: 'ja',
      title: '「女性研究者」を対象にした男女共同参画・科学 技術イノベーション政策の変遷と今後の課題',
    },
  ],
  creator_list: [
    {
      type: 'person',
      names: [
        { lang: 'en', last_name: 'Shiomitsu', first_name: 'Noriko' },
        { lang: 'ja', last_name: '塩満', first_name: '典子' },
      ],
      researcher_id_list: [],
    },
    {
      type: 'person',
      names: [
        { lang: 'en', last_name: 'Honma', first_name: 'Miwako' },
        { lang: 'ja', last_name: '本間', first_name: '美和子' },
      ],
      researcher_id_list: [],
    },
    {
      type: 'person',
      names: [
        { lang: 'en', last_name: 'Yamada', first_name: 'Keiko' },
        { lang: 'ja', last_name: '山田', first_name: '惠子' },
      ],
      researcher_id_list: [],
    },
  ],
  publication_date: Temporal.PlainDate.from('2025-01-28'),
} satisfies typeof JapanLinkCenter.Record.Type
