declare namespace Intl {
  interface Locale {
    getTextInfo(): {
      direction: 'ltr' | 'rtl'
    }
  }
}
