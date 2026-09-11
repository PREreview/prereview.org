import { type HTMLElement as HtmlElement, type Node as HtmlNode, NodeType } from 'node-html-parser'

export interface Mark {
  type: 'bold' | 'italic'
}

export type Warn = (msg: string) => void

export interface RichTextText {
  nodeType: 'text'
  value: string
  marks: Array<Mark>
  data: Record<string, never>
}

export interface Hyperlink {
  nodeType: 'hyperlink'
  data: { uri: string }
  content: Array<RichTextText>
}

export type Inline = RichTextText | Hyperlink

export const makeText = (value: string, marks: Array<Mark> = []): RichTextText => ({
  nodeType: 'text',
  value,
  marks,
  data: {},
})

function getTag(node: HtmlNode): string {
  return (node as HtmlElement).tagName.toLowerCase()
}

export function toInlines(node: HtmlNode, marks: Array<Mark> = [], warn: Warn): Array<Inline> {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const value = node.text
    return value ? [makeText(value, marks)] : []
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return []

  const el = node as HtmlElement
  switch (getTag(node)) {
    case 'strong':
    case 'b':
      return el.childNodes.flatMap(child => toInlines(child, [...marks, { type: 'bold' }], warn))
    case 'em':
    case 'i':
      return el.childNodes.flatMap(child => toInlines(child, [...marks, { type: 'italic' }], warn))
    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const inlines = el.childNodes.flatMap(child => toInlines(child, marks, warn))
      const textNodes = inlines.filter((c): c is RichTextText => c.nodeType === 'text')
      if (!href) {
        warn(`Skipping <a> with no href (text: "${textNodes.map(n => n.value).join('')}")`)
        return []
      }
      if (!textNodes.length) {
        warn(`Skipping <a href="${href}"> with no text content`)
        return []
      }
      return [{ nodeType: 'hyperlink', data: { uri: href }, content: textNodes }]
    }
    case 'br':
      return []
    default:
      return el.childNodes.flatMap(child => toInlines(child, marks, warn))
  }
}
