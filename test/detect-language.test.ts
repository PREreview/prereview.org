import { describe, expect, test } from '@jest/globals'
import * as O from 'fp-ts/Option'
import * as _ from '../src/detect-language'
import { html, rawHtml } from '../src/html'

describe('detectLanguage', () => {
  test.each([
    ['English', html`<p>This is the text that I want to check</p>`, O.some('en')],
    ['Russian', html`<p>Это текст, который я хочу проверить</p>`, O.some('ru')],
    ['Japanese', html`<p>確認したいテキストです</p>`, O.some('ja')],
    ['No language', rawHtml(' <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>'), O.none],
    ['No letters', rawHtml(' <p>   \n  12345 </p>   '), O.none],
  ])('%s', (_name, input, expected) => {
    const actual = _.detectLanguage(input)

    expect(actual).toStrictEqual(expected)
  })
})

describe('detectLanguageFrom', () => {
  test.each([
    ['The language matches', ['en'] as const, html`<p>This is the text that I want to check</p>`, O.some('en')],
    ['The language does not match', ['en'] as const, html`<p>Это текст, который я хочу проверить</p>`, O.none],
    ['A language matches', ['en', 'ru'] as const, html`<p>Это текст, который я хочу проверить</p>`, O.some('ru')],
    ['No language matches', ['en', 'ru'] as const, html`<p>確認したいテキストです</p>`, O.none],
    ['No letters', ['en', 'ja', 'ru'] as const, rawHtml(' <p>   \n  12345 </p>   '), O.none],
  ])('%s', (_name, languages, input, expected) => {
    const actual = _.detectLanguageFrom(...languages)(input)

    expect(actual).toStrictEqual(expected)
  })
})
