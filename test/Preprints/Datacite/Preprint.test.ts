import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import { Datacite } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/Preprints/Datacite/Preprint.ts'
import { Doi } from '../../../src/types/Doi.ts'
import * as fc from '../../fc.ts'

describe('recordToPreprint', () => {
  test.prop([fc.option(fc.lorem(), { nil: undefined }), fc.option(fc.lorem(), { nil: undefined })], {
    examples: [
      [undefined, 'JournalArticle'],
      ['ResearchArticle', 'DataPaper'],
      ['Journal contribution', 'Text'],
    ],
  })('not a preprint', (resourceType, resourceTypeGeneral) => {
    const record = new Datacite.Record({
      ...stubRecord,
      types: {
        ...stubRecord.types,
        resourceType,
        resourceTypeGeneral,
      },
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('NotAPreprint')
    expect(actual.cause).toStrictEqual({ ...stubRecord.types, resourceType, resourceTypeGeneral })
  })

  test.prop([fc.oneof(fc.crossrefPreprintDoi(), fc.japanLinkCenterPreprintDoi(), fc.nonPreprintDoi())])(
    'not a DataCite preprint ID',
    doi => {
      const record = new Datacite.Record({
        ...stubRecord,
        doi,
      })

      const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

      expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
      expect(actual.cause).toStrictEqual(doi)
    },
  )

  test('no creators', () => {
    const record = new Datacite.Record({
      ...stubRecord,
      creators: [],
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual({ creators: [] })
  })

  test('title language unknown', () => {
    const record = new Datacite.Record({
      ...stubRecord,
      titles: [{ title: '12345' }],
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual('unknown title language')
  })

  test('abstract language unknown', () => {
    const record = new Datacite.Record({
      ...stubRecord,
      descriptions: [{ description: '12345', descriptionType: 'Abstract' }],
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual('unknown abstract language')
  })

  test.prop([
    fc.nonEmptyArray(
      fc.record({ date: fc.oneof(fc.year(), fc.plainYearMonth(), fc.plainDate()), dateType: fc.lorem() }),
    ),
  ])('no posted date', dates => {
    const record = new Datacite.Record({
      ...stubRecord,
      dates,
    })

    const actual = Either.getOrThrow(Either.flip(_.recordToPreprint(record)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual({ dates })
  })
})

const stubRecord = {
  doi: Doi('10.17605/osf.io/eq8bk'),
  creators: [
    {
      givenName: 'Maria Isabel Caetano',
      familyName: 'Da Silva',
      nameIdentifiers: [{ nameIdentifier: 'https://osf.io/bejuy', nameIdentifierScheme: 'URL' }],
    },
    {
      name: 'Eglídia Carla Figueirêdo Vidal',
      nameIdentifiers: [{ nameIdentifier: 'https://osf.io/p3t8m', nameIdentifierScheme: 'URL' }],
    },
    {
      givenName: 'Aline Sampaio Rolim',
      familyName: 'De Sena',
      nameIdentifiers: [{ nameIdentifier: 'https://osf.io/dh3qp', nameIdentifierScheme: 'URL' }],
    },
    {
      givenName: 'Marina Pessoa',
      familyName: 'De Farias Rodrigues',
      nameIdentifiers: [{ nameIdentifier: 'https://osf.io/d86sz', nameIdentifierScheme: 'URL' }],
    },
    {
      givenName: 'Gabriela Duarte',
      familyName: 'Bezerra',
      nameIdentifiers: [
        {
          nameIdentifier: 'https://orcid.org/0000-0002-7472-4621',
          nameIdentifierScheme: 'ORCID',
        },
        { nameIdentifier: 'https://osf.io/2xgv4', nameIdentifierScheme: 'URL' },
      ],
    },
    {
      name: 'WONESKA RODRIGUES PINHEIRO',
      nameIdentifiers: [{ nameIdentifier: 'https://osf.io/gcse5', nameIdentifierScheme: 'URL' }],
    },
  ],
  titles: [
    {
      title: 'Teorias De Enfermagem Para Abordagem Familiar De Potenciais Doadores De Órgãos: revisão de escopo',
    },
  ],
  publisher: 'OSF',
  dates: [{ date: Temporal.PlainDate.from({ year: 2023, month: 9, day: 13 }), dateType: 'Created' }],
  types: {
    resourceType: 'Project',
    resourceTypeGeneral: 'Preprint',
  },
  relatedIdentifiers: [],
  descriptions: [
    {
      description:
        'Revisão de Escopo realizada no período de novembro de 2022 a junho de 2023, que objetivou mapear na literatura quais teorias de enfermagem e estruturas conceituais podem contribuir por suas características na abordagem familiar de potenciais doadores. A revisão foi realizada nas bases de dados LILACS, SCOPUS, SciELO, MEDLINE, EMBASE e Web of science, que foram acessadas via Biblioteca Virtual em Saúde e via Pubmed, bem como, na literatura cinzenta, Google acadêmico e na lista de referência dos estudos. A amostra foi composta por 14 estudos, onde foram identificadas 9 Teorias de Enfermagem.',
      descriptionType: 'Abstract',
    },
  ],
  url: new URL('https://osf.io/eq8bk/'),
  relationships: { provider: 'cos' },
} satisfies typeof Datacite.Record.Type
