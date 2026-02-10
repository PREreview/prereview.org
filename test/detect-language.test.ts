import { describe, expect, test } from '@jest/globals'
import { Effect, Option } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as _ from '../src/detect-language.ts'
import { type Html, html, type PlainText, rawHtml } from '../src/html.ts'
import * as EffectTest from './EffectTest.ts'

describe('detectLanguage', () => {
  test.each<[string, Html | PlainText | string, Option.Option<LanguageCode>]>([
    ['English', html`<p>This is the text that I want to check</p>`, Option.some('en')],
    ['Russian', html`<p>Это текст, который я хочу проверить</p>`, Option.some('ru')],
    ['Japanese', html`<p>確認したいテキストです</p>`, Option.some('ja')],
    ['No language', rawHtml(' <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>'), Option.none()],
    ['No letters', rawHtml(' <p>   \n  12345 </p>   '), Option.none()],
  ])('%s', (_name, input, expected) =>
    Effect.gen(function* () {
      const actual = yield* _.detectLanguage(input)

      expect(actual).toStrictEqual(expected)
    }).pipe(EffectTest.run),
  )
})
