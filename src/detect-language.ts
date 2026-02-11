import cld from 'cld'
import { Array, Effect, Option, Record } from 'effect'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { type Html, PlainText } from './html.ts'

export const detectLanguage = Effect.fn('detectLanguage')(function* (
  text: Html | PlainText | string,
  hint?: LanguageCode,
): Effect.fn.Return<Option.Option<LanguageCode>> {
  const languageHint = hint ? Option.getOrUndefined(iso6393ToHint(hint)) : undefined

  const result = yield* Effect.option(
    Effect.orElse(
      Effect.tryPromise(() =>
        cld.detect(text.toString(), { bestEffort: true, isHTML: !(text instanceof PlainText), languageHint }),
      ),
      () =>
        Effect.tryPromise(() =>
          cld.detect(text.toString(), { bestEffort: true, isHTML: !(text instanceof PlainText) }),
        ),
    ),
  )

  return Option.andThen(result, result =>
    Array.findFirst(result.languages, detected => Option.liftPredicate(detected.code, iso6391.validate)),
  )
})

export function detectLanguageFrom<L extends LanguageCode>(...languages: ReadonlyArray<L>) {
  return Effect.fn(function* (text: Html | PlainText | string, hint?: L): Effect.fn.Return<Option.Option<L>> {
    const languageHint = hint ? Option.getOrUndefined(iso6393ToHint(hint)) : undefined

    const result = yield* Effect.option(
      Effect.orElse(
        Effect.tryPromise(() =>
          cld.detect(text.toString(), { bestEffort: true, isHTML: !(text instanceof PlainText), languageHint }),
        ),
        () =>
          Effect.tryPromise(() =>
            cld.detect(text.toString(), { bestEffort: true, isHTML: !(text instanceof PlainText) }),
          ),
      ),
    )

    return Option.andThen(result, result =>
      Array.findFirst(result.languages, detected =>
        Option.liftPredicate(detected.code as L, code => Array.contains(languages, code)),
      ),
    )
  })
}

const iso6393ToHint = (code: LanguageCode): Option.Option<string> =>
  Record.get(iso6391ToHintMapping as Record<string, string>, code)

const iso6391ToHintMapping = {
  en: 'ENGLISH',
  da: 'DANISH',
  nl: 'DUTCH',
  fi: 'FINNISH',
  fr: 'FRENCH',
  de: 'GERMAN',
  he: 'HEBREW',
  it: 'ITALIAN',
  ja: 'JAPANESE',
  ko: 'KOREAN',
  no: 'NORWEGIAN',
  pl: 'POLISH',
  pt: 'PORTUGUESE',
  ru: 'RUSSIAN',
  es: 'SPANISH',
  sv: 'SWEDISH',
  zh: 'CHINESE',
  cs: 'CZECH',
  el: 'GREEK',
  is: 'ICELANDIC',
  lv: 'LATVIAN',
  lt: 'LITHUANIAN',
  ro: 'ROMANIAN',
  hu: 'HUNGARIAN',
  et: 'ESTONIAN',
  bg: 'BULGARIAN',
  hr: 'CROATIAN',
  sr: 'SERBIAN',
  ga: 'IRISH',
  gl: 'GALICIAN',
  tl: 'TAGALOG',
  tr: 'TURKISH',
  uk: 'UKRAINIAN',
  hi: 'HINDI',
  mk: 'MACEDONIAN',
  bn: 'BENGALI',
  id: 'INDONESIAN',
  la: 'LATIN',
  ms: 'MALAY',
  ml: 'MALAYALAM',
  cy: 'WELSH',
  ne: 'NEPALI',
  te: 'TELUGU',
  sq: 'ALBANIAN',
  ta: 'TAMIL',
  be: 'BELARUSIAN',
  jv: 'JAVANESE',
  oc: 'OCCITAN',
  ur: 'URDU',
  gu: 'GUJARATI',
  th: 'THAI',
  ar: 'ARABIC',
  ca: 'CATALAN',
  eo: 'ESPERANTO',
  eu: 'BASQUE',
  ia: 'INTERLINGUA',
  kn: 'KANNADA',
  pa: 'PUNJABI',
  gd: 'SCOTS_GAELIC',
  sw: 'SWAHILI',
  sl: 'SLOVENIAN',
  mr: 'MARATHI',
  mt: 'MALTESE',
  vi: 'VIETNAMESE',
  fy: 'FRISIAN',
  sk: 'SLOVAK',
  fo: 'FAROESE',
  su: 'SUNDANESE',
  uz: 'UZBEK',
  am: 'AMHARIC',
  az: 'AZERBAIJANI',
  ka: 'GEORGIAN',
  ti: 'TIGRINYA',
  fa: 'PERSIAN',
  bs: 'BOSNIAN',
  si: 'SINHALESE',
  nn: 'NORWEGIAN_N',
  xh: 'XHOSA',
  zu: 'ZULU',
  gn: 'GUARANI',
  st: 'SESOTHO',
  tk: 'TURKMEN',
  ky: 'KYRGYZ',
  br: 'BRETON',
  tw: 'TWI',
  yi: 'YIDDISH',
  so: 'SOMALI',
  ug: 'UIGHUR',
  ku: 'KURDISH',
  mn: 'MONGOLIAN',
  hy: 'ARMENIAN',
  lo: 'LAOTHIAN',
  sd: 'SINDHI',
  rm: 'RHAETO_ROMANCE',
  af: 'AFRIKAANS',
  lb: 'LUXEMBOURGISH',
  my: 'BURMESE',
  km: 'KHMER',
  bo: 'TIBETAN',
  dv: 'DHIVEHI',
  or: 'ORIYA',
  as: 'ASSAMESE',
  co: 'CORSICAN',
  ie: 'INTERLINGUE',
  kk: 'KAZAKH',
  ln: 'LINGALA',
  ps: 'PASHTO',
  qu: 'QUECHUA',
  sn: 'SHONA',
  tg: 'TAJIK',
  tt: 'TATAR',
  to: 'TONGA',
  yo: 'YORUBA',
  mi: 'MAORI',
  wo: 'WOLOF',
  ab: 'ABKHAZIAN',
  aa: 'AFAR',
  ay: 'AYMARA',
  ba: 'BASHKIR',
  bi: 'BISLAMA',
  dz: 'DZONGKHA',
  fj: 'FIJIAN',
  kl: 'GREENLANDIC',
  ha: 'HAUSA',
  ht: 'HAITIAN_CREOLE',
  ik: 'INUPIAK',
  iu: 'INUKTITUT',
  ks: 'KASHMIRI',
  rw: 'KINYARWANDA',
  mg: 'MALAGASY',
  na: 'NAURU',
  om: 'OROMO',
  rn: 'RUNDI',
  sm: 'SAMOAN',
  sg: 'SANGO',
  sa: 'SANSKRIT',
  ss: 'SISWANT',
  ts: 'TSONGA',
  tn: 'TSWANA',
  vo: 'VOLAPUK',
  za: 'ZHUANG',
  lg: 'GANDA',
  gv: 'MANX',
  ak: 'AKAN',
  ig: 'IGBO',
  ee: 'EWE',
  ny: 'NYANJA',
  os: 'OSSETIAN',
  ve: 'VENDA',
} satisfies Partial<Record<LanguageCode, string>>
