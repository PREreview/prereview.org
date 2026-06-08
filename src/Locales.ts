import rtlDetect from 'rtl-detect'
import { html } from './html.ts'

export const languageAttributesFor = (locale: string) => html`lang="${locale}" dir="${rtlDetect.getLangDir(locale)}"`
