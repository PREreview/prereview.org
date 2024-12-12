import { Array, flow, Option, pipe } from 'effect'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { detect, detectAll } from 'tinyld/heavy'
import { type Html, plainText } from './html.js'

export function detectLanguage(html: Html): Option.Option<LanguageCode> {
  return pipe(
    detectAll(plainText(html).toString()),
    Array.findFirst(({ lang }) => Option.liftPredicate(lang, iso6391Validate)),
  )
}

export function detectLanguageFrom<L extends LanguageCode>(
  ...languages: ReadonlyArray<L>
): (html: Html) => Option.Option<L> {
  return flow(
    html => detect(plainText(html).toString(), { only: [...languages] }) as L,
    Option.liftPredicate(detected => Array.contains(languages, detected)),
  )
}

// https://github.com/meikidd/iso-639-1/pull/61
const iso6391Validate = iso6391.validate as (code: string) => code is LanguageCode
