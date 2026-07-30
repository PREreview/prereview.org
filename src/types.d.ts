declare namespace Intl {
  interface Locale {
    getTextInfo(): {
      direction: 'ltr' | 'rtl'
    }
  }
}

declare module 'contentful-resolve-response' {
  declare const resolveResponse: (response: unknown) => Array<unknown>

  export default resolveResponse
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
