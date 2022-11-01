import boldIcon from 'remixicon/icons/Editor/bold.svg'

class HtmlEditor extends HTMLElement {
  static element = 'html-editor' as const

  constructor() {
    super()
  }

  async connectedCallback() {
    const [{ Editor }, { Link }, { Subscript }, { Superscript }, { Typography }, { default: StarterKit }] =
      await Promise.all([
        import('@tiptap/core'),
        import('@tiptap/extension-link'),
        import('@tiptap/extension-subscript'),
        import('@tiptap/extension-superscript'),
        import('@tiptap/extension-typography'),
        import('@tiptap/starter-kit'),
      ])

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

    if (this.hasAttribute('toolbar')) {
      const toolbar = document.createElement('tool-bar')
      toolbar.setAttribute('role', 'toolbar')
      toolbar.setAttribute('aria-controls', textArea.id)
      toolbar.setAttribute('aria-label', 'Formatting')

      const bold = document.createElement('button')
      bold.type = 'button'
      bold.addEventListener('click', () => editor.chain().focus().toggleBold().run())
      bold.setAttribute('aria-pressed', 'false')
      bold.disabled = true

      const boldImage = document.createElement('img')
      boldImage.alt = 'Bold'
      boldImage.src = boldIcon
      bold.append(boldImage)

      toolbar.append(bold)

      editor.on('transaction', () => {
        bold.setAttribute('aria-pressed', editor.isActive('bold') ? 'true' : 'false')
        bold.disabled = !editor.can().toggleBold()
      })

      editor.options.element.prepend(toolbar)
    }

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
