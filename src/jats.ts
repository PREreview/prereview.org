import sanitize from 'sanitize-html'
import { type Html, rawHtml } from './html'

export function transformJatsToHtml(jats: string): Html {
  const sanitized = sanitize(jats, {
    allowedAttributes: {
      '*': ['dir', 'lang'],
      a: ['href'],
    },
    exclusiveFilter: frame =>
      frame.tag === 'jats:title' &&
      (frame.text.toLowerCase() === 'abstract' || frame.text.toLowerCase() === 'graphical abstract'),
    transformTags: {
      'jats:ext-link': (_, attribs) => {
        if (
          attribs['ext-link-type'] !== 'uri' ||
          !attribs['xlink:href'] ||
          !/^[A-z][A-z0-9+\-.]*:/.test(attribs['xlink:href'])
        ) {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      'jats:italic': 'i',
      'jats:p': 'p',
      'jats:related-object': (_, attribs) => {
        if (
          attribs['ext-link-type'] !== 'uri' ||
          !attribs['xlink:href'] ||
          !/^[A-z][A-z0-9+\-.]*:/.test(attribs['xlink:href'])
        ) {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      'jats:sub': 'sub',
      'jats:sup': 'sup',
      'jats:title': 'h4',
    },
  })

  return rawHtml(sanitized)
}
