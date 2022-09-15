void (async () => {
  const [{ Editor }, { Link }, { Subscript }, { Superscript }, { Typography }, { default: StarterKit }] =
    await Promise.all([
      import('@tiptap/core'),
      import('@tiptap/extension-link'),
      import('@tiptap/extension-subscript'),
      import('@tiptap/extension-superscript'),
      import('@tiptap/extension-typography'),
      import('@tiptap/starter-kit'),
    ])

  class HtmlEditor extends HTMLElement {
    static element = 'html-editor' as const

    constructor() {
      super()

      const textArea = this.firstElementChild

      if (!(textArea instanceof HTMLTextAreaElement)) {
        throw new Error('No text area')
      }

      const editor = new Editor({
        editorProps: {
          attributes: {
            'aria-labelledby': replaceLabels(textArea)
              .map(label => label.id)
              .join(' '),
            'aria-multiline': 'true',
            id: textArea.id,
            role: 'textbox',
            ...extractAttributes(textArea, ['aria-errormessage', 'aria-invalid']),
          },
        },
        extensions: [
          StarterKit.configure({
            blockquote: false,
            code: false,
            codeBlock: false,
            hardBreak: false,
            heading: {
              levels: [1, 2, 3],
            },
            horizontalRule: false,
            strike: false,
          }),
          Link.configure({
            openOnClick: false,
          }),
          Subscript,
          Superscript,
          Typography,
        ],
        content: new DOMParser().parseFromString(textArea.innerHTML, 'text/html').documentElement.textContent,
      })

      editor.on('update', ({ editor }) => {
        const html = editor.getHTML()

        textArea.innerText = html !== '<p></p>' ? html : ''
      })

      textArea.insertAdjacentElement('afterend', editor.options.element)
      textArea.hidden = true
      removeAttributes(textArea, ['aria-errormessage', 'aria-invalid', 'id'])
    }
  }

  window.customElements.define(HtmlEditor.element, HtmlEditor)
})()

function replaceLabels(source: HTMLTextAreaElement) {
  return [...source.labels].map(label => {
    const replacement = document.createElement('span')
    replacement.append(...label.childNodes)
    replacement.id = label.id

    label.replaceWith(replacement)

    return replacement
  })
}

function extractAttributes(source: Element, qualifiedNames: ReadonlyArray<string>): Record<string, string> {
  return Object.fromEntries(
    qualifiedNames.flatMap(qualifiedName => {
      const value = source.getAttribute(qualifiedName)

      if (!value) {
        return []
      }

      return [[qualifiedName, value]]
    }),
  )
}

function removeAttributes(source: Element, qualifiedNames: ReadonlyArray<string>) {
  qualifiedNames.forEach(qualifiedName => source.removeAttribute(qualifiedName))
}
