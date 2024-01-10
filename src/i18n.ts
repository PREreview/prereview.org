import { flow } from 'fp-ts/function'
import i18next from 'i18next'
import * as en from '../locales/en.json'
import * as es from '../locales/es.json'
import { rawHtml } from './html'

const defaultNS = 'common'

const resources = {
  en: {
    common: en,
  },
  es: {
    common: es,
  },
}

void i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['ns1', 'ns2'],
  defaultNS,
  resources,
})

void i18next.changeLanguage('es')

export const i18n = i18next

export const t = flow(i18n.t, rawHtml)

export type Translate = typeof t

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['en']
  }
}
