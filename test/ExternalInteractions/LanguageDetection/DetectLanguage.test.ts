import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Layer, Option, pipe, Schema } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { DetectLanguage } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/ExternalInteractions/LanguageDetection/DetectLanguage.ts'
import * as EffectTest from '../../EffectTest.ts'

test.each<{ response: string; expected: Option.Option<LanguageCode> }>([
  {
    response: 'hello',
    expected: Option.some('en'),
  },
  {
    response: 'prego',
    expected: Option.some('pt'),
  },
  {
    response: 'made-up-non-iso639-1',
    expected: Option.some('pl'),
  },
  {
    response: '1',
    expected: Option.none(),
  },
])('detectLanguage ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const detected = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/DetectLanguage/DetectSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(DetectLanguage.LanguageCandidates))),
    )

    const actual = yield* Effect.option(
      Effect.provide(
        _.detectLanguage('some text'),
        Layer.mock(DetectLanguage.DetectLanguage, { detect: () => Effect.succeed(detected) }),
      ),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each<{ response: string; languages: ReadonlyArray<LanguageCode>; expected: Option.Option<LanguageCode> }>([
  {
    response: 'hello',
    languages: ['en'],
    expected: Option.some('en'),
  },
  {
    response: 'hello',
    languages: ['fr'],
    expected: Option.none(),
  },
  {
    response: 'prego',
    languages: ['ca', 'it'],
    expected: Option.some('it'),
  },
  {
    response: '1',
    languages: ['en'],
    expected: Option.none(),
  },
])('detectLanguageFrom ($response)', ({ response, languages, expected }) =>
  Effect.gen(function* () {
    const detected = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/DetectLanguage/DetectSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(DetectLanguage.LanguageCandidates))),
    )

    const actual = yield* Effect.option(
      Effect.provide(
        _.detectLanguageFrom(languages, 'some text'),
        Layer.mock(DetectLanguage.DetectLanguage, { detect: () => Effect.succeed(detected) }),
      ),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
