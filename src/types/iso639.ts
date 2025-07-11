import { Option, pipe, Schema } from 'effect'
import iso6391, { type LanguageCode as Iso6391Code } from 'iso-639-1'
import type iso6393 from 'iso-639-3/to-1.json'
import type { SupportedLocale } from '../locales/index.js'

export type Iso6393Code = keyof Omit<typeof iso6393, 'hbs'>

export const iso6393Validate = (code: string): code is Iso6393Code =>
  Object.prototype.hasOwnProperty.call(iso6393To1Mapping, code)

export const Iso6393Schema = pipe(Schema.String, Schema.filter(iso6393Validate))

export const Iso6391Schema = pipe(Schema.String, Schema.filter(iso6391.validate))

export const iso6393To1 = (code: Iso6393Code): Iso6391Code => iso6393To1Mapping[code]

export const iso6391To3 = (code: Iso6391Code): Iso6393Code => swapFn(iso6393To1Mapping)[code]

export const localeToIso6391 = (locale: SupportedLocale): Option.Option<Iso6391Code> => {
  const language = locale.split('-')[0] ?? ''

  return Option.liftPredicate(language, iso6391.validate)
}

const iso6393To1Mapping = {
  aar: 'aa',
  abk: 'ab',
  afr: 'af',
  aka: 'ak',
  amh: 'am',
  ara: 'ar',
  arg: 'an',
  asm: 'as',
  ava: 'av',
  ave: 'ae',
  aym: 'ay',
  aze: 'az',
  bak: 'ba',
  bam: 'bm',
  bel: 'be',
  ben: 'bn',
  bis: 'bi',
  bod: 'bo',
  bos: 'bs',
  bre: 'br',
  bul: 'bg',
  cat: 'ca',
  ces: 'cs',
  cha: 'ch',
  che: 'ce',
  chu: 'cu',
  chv: 'cv',
  cor: 'kw',
  cos: 'co',
  cre: 'cr',
  cym: 'cy',
  dan: 'da',
  deu: 'de',
  div: 'dv',
  dzo: 'dz',
  ell: 'el',
  eng: 'en',
  epo: 'eo',
  est: 'et',
  eus: 'eu',
  ewe: 'ee',
  fao: 'fo',
  fas: 'fa',
  fij: 'fj',
  fin: 'fi',
  fra: 'fr',
  fry: 'fy',
  ful: 'ff',
  gla: 'gd',
  gle: 'ga',
  glg: 'gl',
  glv: 'gv',
  grn: 'gn',
  guj: 'gu',
  hat: 'ht',
  hau: 'ha',
  heb: 'he',
  her: 'hz',
  hin: 'hi',
  hmo: 'ho',
  hrv: 'hr',
  hun: 'hu',
  hye: 'hy',
  ibo: 'ig',
  ido: 'io',
  iii: 'ii',
  iku: 'iu',
  ile: 'ie',
  ina: 'ia',
  ind: 'id',
  ipk: 'ik',
  isl: 'is',
  ita: 'it',
  jav: 'jv',
  jpn: 'ja',
  kal: 'kl',
  kan: 'kn',
  kas: 'ks',
  kat: 'ka',
  kau: 'kr',
  kaz: 'kk',
  khm: 'km',
  kik: 'ki',
  kin: 'rw',
  kir: 'ky',
  kom: 'kv',
  kon: 'kg',
  kor: 'ko',
  kua: 'kj',
  kur: 'ku',
  lao: 'lo',
  lat: 'la',
  lav: 'lv',
  lim: 'li',
  lin: 'ln',
  lit: 'lt',
  ltz: 'lb',
  lub: 'lu',
  lug: 'lg',
  mah: 'mh',
  mal: 'ml',
  mar: 'mr',
  mkd: 'mk',
  mlg: 'mg',
  mlt: 'mt',
  mon: 'mn',
  mri: 'mi',
  msa: 'ms',
  mya: 'my',
  nau: 'na',
  nav: 'nv',
  nbl: 'nr',
  nde: 'nd',
  ndo: 'ng',
  nep: 'ne',
  nld: 'nl',
  nno: 'nn',
  nob: 'nb',
  nor: 'no',
  nya: 'ny',
  oci: 'oc',
  oji: 'oj',
  ori: 'or',
  orm: 'om',
  oss: 'os',
  pan: 'pa',
  pli: 'pi',
  pol: 'pl',
  por: 'pt',
  pus: 'ps',
  que: 'qu',
  roh: 'rm',
  ron: 'ro',
  run: 'rn',
  rus: 'ru',
  sag: 'sg',
  san: 'sa',
  sin: 'si',
  slk: 'sk',
  slv: 'sl',
  sme: 'se',
  smo: 'sm',
  sna: 'sn',
  snd: 'sd',
  som: 'so',
  sot: 'st',
  spa: 'es',
  sqi: 'sq',
  srd: 'sc',
  srp: 'sr',
  ssw: 'ss',
  sun: 'su',
  swa: 'sw',
  swe: 'sv',
  tah: 'ty',
  tam: 'ta',
  tat: 'tt',
  tel: 'te',
  tgk: 'tg',
  tgl: 'tl',
  tha: 'th',
  tir: 'ti',
  ton: 'to',
  tsn: 'tn',
  tso: 'ts',
  tuk: 'tk',
  tur: 'tr',
  twi: 'tw',
  uig: 'ug',
  ukr: 'uk',
  urd: 'ur',
  uzb: 'uz',
  ven: 've',
  vie: 'vi',
  vol: 'vo',
  wln: 'wa',
  wol: 'wo',
  xho: 'xh',
  yid: 'yi',
  yor: 'yo',
  zha: 'za',
  zho: 'zh',
  zul: 'zu',
} satisfies Record<Iso6393Code, Iso6391Code>

const swapFn = <T extends Record<string, S>, S extends string>(obj: T): { [K in keyof T as T[K]]: K } =>
  Object.entries(obj).reduce((res, [key, value]) => {
    return { ...res, [value]: key }
  }, {}) as never
