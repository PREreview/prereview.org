import { describe, expect, test } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../src/detect-language.ts'
import { html, rawHtml } from '../src/html.ts'

describe('detectLanguage', () => {
  test.each([
    ['English', html`<p>This is the text that I want to check</p>`, Option.some('en')],
    ['Russian', html`<p>Это текст, который я хочу проверить</p>`, Option.some('ru')],
    ['Japanese', html`<p>確認したいテキストです</p>`, Option.some('ja')],
    ['No language', rawHtml(' <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>'), Option.none()],
    ['No letters', rawHtml(' <p>   \n  12345 </p>   '), Option.none()],
  ])('%s', (_name, input, expected) => {
    const actual = _.detectLanguage(input)

    expect(actual).toStrictEqual(expected)
  })
})

describe('detectLanguageFrom', () => {
  test.each([
    ['The language matches', ['en'] as const, html`<p>This is the text that I want to check</p>`, Option.some('en')],
    ['The language does not match', ['en'] as const, html`<p>Это текст, который я хочу проверить</p>`, Option.none()],
    ['A language matches', ['en', 'ru'] as const, html`<p>Это текст, который я хочу проверить</p>`, Option.some('ru')],
    ['No language matches', ['en', 'ru'] as const, html`<p>確認したいテキストです</p>`, Option.none()],
    ['No letters', ['en', 'ja', 'ru'] as const, rawHtml(' <p>   \n  12345 </p>   '), Option.none()],
  ])('%s', (_name, languages, input, expected) => {
    const actual = _.detectLanguageFrom(...languages)(input)

    expect(actual).toStrictEqual(expected)
  })
})
