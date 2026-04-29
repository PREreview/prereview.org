import { it, test } from '@effect/vitest'
import { Effect } from 'effect'
import { describe, expect } from 'vitest'
import { Crossref } from '../../../../src/ExternalApis/index.ts'
import { LanguageDetection } from '../../../../src/ExternalInteractions/index.ts'
import * as _ from '../../../../src/ExternalInteractions/PreprintData/Crossref/Preprint.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'

describe('workToPreprint', () => {
  it.effect.prop(
    'not a preprint',
    [fc.lorem(), fc.option(fc.lorem(), { nil: undefined })],
    ([type, subtype]) =>
      Effect.gen(function* () {
        const work = new Crossref.Work({
          ...stubWork,
          type,
          subtype,
        })

        const actual = yield* Effect.flip(_.workToPreprint(work))

        expect(actual._tag).toStrictEqual('NotAPreprint')
        expect(actual.cause).toStrictEqual({ type, subtype })
      }).pipe(Effect.provide(LanguageDetection.layerCld)),
    {
      fastCheck: {
        examples: [
          ['journal-article', undefined],
          ['posted-content', undefined],
          ['posted-content', 'dissertation'],
          ['posted-content', 'other'],
        ],
      },
    },
  )

  it.effect.prop(
    'not a Crossref preprint ID',
    [fc.oneof(fc.datacitePreprintDoi(), fc.japanLinkCenterPreprintDoi(), fc.nonPreprintDoi())],
    ([doi]) =>
      Effect.gen(function* () {
        const work = new Crossref.Work({
          ...stubWork,
          DOI: doi,
        })

        const actual = yield* Effect.flip(_.workToPreprint(work))

        expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
        expect(actual.cause).toStrictEqual(doi)
      }).pipe(Effect.provide(LanguageDetection.layerCld)),
  )

  test('no authors', () =>
    Effect.gen(function* () {
      const work = new Crossref.Work({
        ...stubWork,
        author: [],
      })

      const actual = yield* Effect.flip(_.workToPreprint(work))

      expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
      expect(actual.cause).toStrictEqual({ author: [] })
    }).pipe(Effect.provide(LanguageDetection.layerCld), EffectTest.run))

  test('no title', () =>
    Effect.gen(function* () {
      const work = new Crossref.Work({
        ...stubWork,
        title: [],
      })

      const actual = yield* Effect.flip(_.workToPreprint(work))

      expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
      expect(actual.cause).toStrictEqual({ title: [] })
    }).pipe(Effect.provide(LanguageDetection.layerCld), EffectTest.run))
})

const stubWork = {
  DOI: Doi('10.2139/ssrn.5186959'),
  resource: {
    primary: {
      URL: new URL('https://www.ssrn.com/abstract=5186959'),
    },
  },
  title: [
    'Enhanced Flavoprotein Autofluorescence Imaging in Rats Using a Combination of Thin Skull Window and Skull-Clearing Reagents',
  ],
  author: [
    { given: 'Kazuaki', family: 'Nagasaka' },
    { given: 'Yuto', family: 'Ogawa' },
    { given: 'Daisuke', family: 'Ishii' },
    { given: 'Ayane', family: 'Nagao' },
    { given: 'Hitomi', family: 'Ikarashi' },
    { given: 'Naofumi', family: 'Otsuru' },
    { given: 'Hideaki', family: 'Onishi' },
  ],
  published: 2025,
  'group-title': 'SSRN',
  type: 'posted-content',
  subtype: 'preprint',
} satisfies typeof Crossref.Work.Type
