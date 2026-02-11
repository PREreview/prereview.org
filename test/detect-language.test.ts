import { describe, expect, test } from '@jest/globals'
import { type Array, Effect, Option } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as _ from '../src/detect-language.ts'
import { type Html, html, type PlainText, rawHtml } from '../src/html.ts'
import * as EffectTest from './EffectTest.ts'

describe('detectLanguage', () => {
  test.each<[string, Html | PlainText | string, Option.Option<LanguageCode>, LanguageCode?]>([
    ['English', html`<p>This is the text that I want to check</p>`, Option.some('en')],
    ['English with hint', html`<p>This is the text that I want to check</p>`, Option.some('en'), 'en'],
    ['English with wrong hint', html`<p>This is the text that I want to check</p>`, Option.some('en'), 'de'],
    ['Russian', html`<p>Это текст, который я хочу проверить</p>`, Option.some('ru')],
    ['Japanese', html`<p>確認したいテキストです</p>`, Option.some('ja')],
    ['Japanese with hint', html`<p>確認したいテキストです</p>`, Option.some('ja'), 'ja'],
    ['Japanese with wrong hint', html`<p>確認したいテキストです</p>`, Option.some('ja'), 'zh'],
    ['No language', rawHtml(' <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>'), Option.none()],
    ['No letters', rawHtml(' <p>   \n  12345 </p>   '), Option.none()],
    ['Greek character', 'I contain a β character', Option.some('en')],
    ['Initializm', 'The EOSC Interoperability Framework', Option.some('en')],
    ['Short sentence', 'Short sentence', Option.some('en')],
  ])('%s', (_name, input, expected, hint = undefined) =>
    Effect.gen(function* () {
      const actual = yield* _.detectLanguage(input, hint)

      expect(actual).toStrictEqual(expected)
    }).pipe(EffectTest.run),
  )
})

describe('detectLanguageFrom', () => {
  test.each<
    [string, Array.NonEmptyArray<LanguageCode>, Html | PlainText | string, Option.Option<LanguageCode>, LanguageCode?]
  >([
    ['The language matches', ['en'], html`<p>This is the text that I want to check</p>`, Option.some('en')],
    ['The language does not match', ['en'], html`<p>Это текст, который я хочу проверить</p>`, Option.none()],
    ['A language matches', ['en', 'ru'], html`<p>Это текст, который я хочу проверить</p>`, Option.some('ru')],
    [
      'A language matches with a hint',
      ['en', 'ru'],
      html`<p>Это текст, который я хочу проверить</p>`,
      Option.some('ru'),
      'ru',
    ],
    [
      'A language matches with a wrong hint',
      ['en', 'ru'],
      html`<p>Это текст, который я хочу проверить</p>`,
      Option.some('ru'),
      'en',
    ],
    ['No language matches', ['en', 'ru'], html`<p>確認したいテキストです</p>`, Option.none()],
    ['No letters', ['en', 'ja', 'ru'], rawHtml(' <p>   \n  12345 </p>   '), Option.none()],
  ])('%s', (_name, languages, input, expected, hint = undefined) =>
    Effect.gen(function* () {
      const actual = yield* _.detectLanguageFrom(...languages)(input, hint)

      expect(actual).toStrictEqual(expected)
    }).pipe(EffectTest.run),
  )
})
