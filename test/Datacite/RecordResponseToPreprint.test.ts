import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Struct } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { recordToPreprint } from '../../src/Datacite/Preprint.js'
import { Record, ResponseSchema } from '../../src/Datacite/Record.js'
import { rawHtml } from '../../src/html.js'
import { Preprint } from '../../src/preprint.js'
import * as EffectTest from '../EffectTest.js'

test.each([
  {
    response: 'osf-project',
    expected: Preprint({
      abstract: {
        language: 'pt',
        text: rawHtml(
          '<p>Revisão de Escopo realizada no período de novembro de 2022 a junho de 2023, que objetivou mapear na literatura quais teorias de enfermagem e estruturas conceituais podem contribuir por suas características na abordagem familiar de potenciais doadores. A revisão foi realizada nas bases de dados LILACS, SCOPUS, SciELO, MEDLINE, EMBASE e Web of science, que foram acessadas via Biblioteca Virtual em Saúde e via Pubmed, bem como, na literatura cinzenta, Google acadêmico e na lista de referência dos estudos. A amostra foi composta por 14 estudos, onde foram identificadas 9 Teorias de Enfermagem.</p>',
        ),
      },
      authors: [
        { name: 'Maria Isabel Caetano Da Silva', orcid: undefined },
        { name: 'Eglídia Carla Figueirêdo Vidal', orcid: undefined },
        { name: 'Aline Sampaio Rolim De Sena', orcid: undefined },
        { name: 'Marina Pessoa De Farias Rodrigues', orcid: undefined },
        { name: 'Gabriela Duarte Bezerra', orcid: Orcid('0000-0002-7472-4621') },
        { name: 'WONESKA RODRIGUES PINHEIRO', orcid: undefined },
      ],
      id: { type: 'osf', value: Doi('10.17605/osf.io/eq8bk') },
      posted: Temporal.PlainDate.from({ year: 2023, month: 9, day: 13 }),
      title: {
        language: 'pt',
        text: rawHtml(
          'Teorias De Enfermagem Para Abordagem Familiar De Potenciais Doadores De Órgãos: revisão de escopo',
        ),
      },
      url: new URL('https://osf.io/eq8bk'),
    }),
  },
])('can parse a DataCite record ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Record)))),
      Effect.andThen(Struct.get('data')),
      Effect.andThen(Struct.get('attributes')),
      Effect.andThen(recordToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each(['lifecycle-journal', 'osf-file', 'osf-registration'])(
  'returns a specific error for non-Preprint record (%s)',
  response =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        FileSystem.FileSystem,
        Effect.andThen(fs => fs.readFileString(`test/Datacite/RecordSamples/${response}.json`)),
        Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Record)))),
        Effect.andThen(Struct.get('data')),
        Effect.andThen(Struct.get('attributes')),
        Effect.andThen(recordToPreprint),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('NotAPreprint')
    }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
