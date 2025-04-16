import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Either, pipe, Schema, Struct } from 'effect'
import { recordToPreprint } from '../../src/Datacite/Preprint.js'
import { Record, ResponseSchema } from '../../src/Datacite/Record.js'
import * as EffectTest from '../EffectTest.js'

test.each(['osf-project'])('can parse a DataCite record (%s)', response =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Record)))),
      Effect.andThen(Struct.get('data')),
      Effect.andThen(Struct.get('attributes')),
      Effect.either,
    )

    expect(Either.isRight(actual)).toBeTruthy()
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each(['osf-file', 'osf-registration'])('returns a specific error for non-Preprint record (%s)', response =>
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
