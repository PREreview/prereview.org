import * as O from 'fp-ts/Option'
import { flow, pipe } from 'fp-ts/function'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { detect } from 'tinyld/heavy'
import { type Html, plainText } from './html'

export function detectLanguage(html: Html): O.Option<LanguageCode> {
  return pipe(detect(plainText(html).toString()), O.fromPredicate(iso6391Validate))
}

export function detectLanguageFrom<L extends LanguageCode>(
  ...languages: ReadonlyArray<L>
): (html: Html) => O.Option<L> {
  return flow(
    html => detect(plainText(html).toString(), { only: [...languages] }) as L,
    O.fromPredicate(detected => languages.includes(detected)),
  )
}

// https://github.com/meikidd/iso-639-1/pull/61
const iso6391Validate = iso6391.validate as (code: string) => code is LanguageCode
