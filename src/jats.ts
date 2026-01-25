import sanitize from 'sanitize-html'
import { sanitizeHtml, type Html } from './html.ts'

export function transformJatsToHtml(jats: string): Html {
  const sanitized = sanitize(jats.replaceAll(/(?<=<\/?)[a-z]+:(?=[a-z-]+[\s|>])/g, ''), {
    allowedAttributes: {
      '*': ['dir', 'lang'],
      a: ['href'],
    },
    exclusiveFilter: frame =>
      frame.tag === 'title' &&
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
      'ext-link': (_, attribs) => {
        if (
          attribs['ext-link-type'] !== 'uri' ||
          typeof attribs['xlink:href'] !== 'string' ||
          !/^[A-z][A-z0-9+\-.]*:/.test(attribs['xlink:href'])
        ) {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      italic: 'i',
      list: (_, attribs) => {
        return { tagName: attribs['list-type'] === 'order' ? 'ol' : 'ul', attribs }
      },
      'list-item': 'li',
      'related-object': (_, attribs) => {
        if (
          attribs['ext-link-type'] !== 'uri' ||
          typeof attribs['xlink:href'] !== 'string' ||
          !/^[A-z][A-z0-9+\-.]*:/.test(attribs['xlink:href'])
        ) {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      title: 'h4',
    },
    nonTextTags: [],
  })

  return sanitizeHtml(sanitized)
}
