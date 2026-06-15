declare namespace Intl {
  interface Locale {
    getTextInfo(): {
      direction: 'ltr' | 'rtl'
    }
  }
}

declare module 'postcss-font-display' {
  import type { PluginCreator } from 'postcss'

  export interface PostcssFontDisplayOptions {
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' | (string & {})
    replace?: boolean
  }

  declare const postcssFontDisplay: PluginCreator<PostcssFontDisplayOptions>

  export default postcssFontDisplay
}
