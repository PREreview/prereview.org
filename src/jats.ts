import sanitize from 'sanitize-html'
import { type Html, rawHtml } from './html.ts'

export function transformJatsToHtml(jats: string): Html {
  const sanitized = sanitize(jats, {
    allowedAttributes: {
      '*': ['dir', 'lang'],
      a: ['href'],
    },
    exclusiveFilter: frame =>
      frame.tag === 'jats:title' &&
      (frame.text.toLowerCase() === 'abstract' ||
        frame.text.toLowerCase() === 'abstract:' ||
        frame.text.toLowerCase() === 'graphical abstract'),
    transformTags: {
      '*': (tagName, attribs) => {
        if (typeof attribs['xml:lang'] === 'string') {
          attribs['lang'] = attribs['xml:lang']
          delete attribs['xml:lang']
        }

        return { tagName, attribs }
      },
      'jats:ext-link': (_, attribs) => {
        if (
          attribs['ext-link-type'] !== 'uri' ||
          typeof attribs['xlink:href'] !== 'string' ||
          !/^[A-z][A-z0-9+\-.]*:/.test(attribs['xlink:href'])
        ) {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      'jats:italic': 'i',
      'jats:list': (_, attribs) => {
        return { tagName: attribs['list-type'] === 'order' ? 'ol' : 'ul', attribs }
      },
      'jats:list-item': 'li',
      'jats:p': 'p',
      'jats:related-object': (_, attribs) => {
        if (
          attribs['ext-link-type'] !== 'uri' ||
          typeof attribs['xlink:href'] !== 'string' ||
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
