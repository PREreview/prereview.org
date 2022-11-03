import boldIcon from 'remixicon/icons/Editor/bold.svg'
import heading1Icon from 'remixicon/icons/Editor/h-1.svg'
import heading2Icon from 'remixicon/icons/Editor/h-2.svg'
import heading3Icon from 'remixicon/icons/Editor/h-3.svg'
import italicIcon from 'remixicon/icons/Editor/italic.svg'
import numberedListIcon from 'remixicon/icons/Editor/list-ordered.svg'
import bulletedListIcon from 'remixicon/icons/Editor/list-unordered.svg'
import subscriptIcon from 'remixicon/icons/Editor/subscript.svg'
import superscriptIcon from 'remixicon/icons/Editor/superscript.svg'

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
        Subscript.extend({
          excludes: 'superscript',
        }),
        Superscript.extend({
          excludes: 'subscript',
        }),
        Typography,
      ],
      content: new DOMParser().parseFromString(textArea.innerHTML, 'text/html').documentElement.textContent,
    })

    if (this.hasAttribute('toolbar')) {
      const toolbar = document.createElement('editor-toolbar')
      toolbar.setAttribute('role', 'toolbar')
      toolbar.setAttribute('aria-controls', textArea.id)
      toolbar.setAttribute('aria-label', 'Formatting')

      const bold = document.createElement('button')
      bold.type = 'button'
      bold.addEventListener('click', () => {
        if (bold.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleBold().run()
      })
      bold.setAttribute('aria-pressed', 'false')
      bold.setAttribute('aria-disabled', 'true')

      const boldImage = document.createElement('img')
      boldImage.alt = 'Bold'
      boldImage.src = boldIcon
      bold.append(boldImage)

      const italic = document.createElement('button')
      italic.type = 'button'
      italic.addEventListener('click', () => {
        if (italic.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleItalic().run()
      })
      italic.setAttribute('aria-pressed', 'false')
      italic.setAttribute('aria-disabled', 'true')

      const italicImage = document.createElement('img')
      italicImage.alt = 'Italic'
      italicImage.src = italicIcon
      italic.append(italicImage)

      const subscript = document.createElement('button')
      subscript.type = 'button'
      subscript.addEventListener('click', () => {
        if (subscript.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleSubscript().run()
      })
      subscript.setAttribute('aria-pressed', 'false')
      subscript.setAttribute('aria-disabled', 'true')

      const subscriptImage = document.createElement('img')
      subscriptImage.alt = 'Subscript'
      subscriptImage.src = subscriptIcon
      subscript.append(subscriptImage)

      const superscript = document.createElement('button')
      superscript.type = 'button'
      superscript.addEventListener('click', () => {
        if (superscript.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleSuperscript().run()
      })
      superscript.setAttribute('aria-pressed', 'false')
      superscript.setAttribute('aria-disabled', 'true')

      const superscriptImage = document.createElement('img')
      superscriptImage.alt = 'Superscript'
      superscriptImage.src = superscriptIcon
      superscript.append(superscriptImage)

      const formatting = document.createElement('div')
      formatting.setAttribute('role', 'group')
      formatting.append(bold, italic, subscript, superscript)

      const heading1 = document.createElement('button')
      heading1.type = 'button'
      heading1.addEventListener('click', () => {
        if (heading1.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleHeading({ level: 1 }).run()
      })
      heading1.setAttribute('aria-pressed', 'false')
      heading1.setAttribute('aria-disabled', 'true')

      const heading1Image = document.createElement('img')
      heading1Image.alt = 'Heading level 1'
      heading1Image.src = heading1Icon
      heading1.append(heading1Image)

      const heading2 = document.createElement('button')
      heading2.type = 'button'
      heading2.addEventListener('click', () => {
        if (heading2.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleHeading({ level: 2 }).run()
      })
      heading2.setAttribute('aria-pressed', 'false')
      heading2.setAttribute('aria-disabled', 'true')

      const heading2Image = document.createElement('img')
      heading2Image.alt = 'Heading level 2'
      heading2Image.src = heading2Icon
      heading2.append(heading2Image)

      const heading3 = document.createElement('button')
      heading3.type = 'button'
      heading3.addEventListener('click', () => {
        if (heading3.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleHeading({ level: 3 }).run()
      })
      heading3.setAttribute('aria-pressed', 'false')
      heading3.setAttribute('aria-disabled', 'true')

      const heading3Image = document.createElement('img')
      heading3Image.alt = 'Heading level 3'
      heading3Image.src = heading3Icon
      heading3.append(heading3Image)

      const bulletedList = document.createElement('button')
      bulletedList.type = 'button'
      bulletedList.addEventListener('click', () => {
        if (bulletedList.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleBulletList().run()
      })
      bulletedList.setAttribute('aria-pressed', 'false')
      bulletedList.setAttribute('aria-disabled', 'true')

      const bulletedListImage = document.createElement('img')
      bulletedListImage.alt = 'Bulleted list'
      bulletedListImage.src = bulletedListIcon
      bulletedList.append(bulletedListImage)

      const numberedList = document.createElement('button')
      numberedList.type = 'button'
      numberedList.addEventListener('click', () => {
        if (numberedList.getAttribute('aria-disabled') === 'true') {
          return
        }

        editor.chain().focus().toggleOrderedList().run()
      })
      numberedList.setAttribute('aria-pressed', 'false')
      numberedList.setAttribute('aria-disabled', 'true')

      const numberedListImage = document.createElement('img')
      numberedListImage.alt = 'Numbered list'
      numberedListImage.src = numberedListIcon
      numberedList.append(numberedListImage)

      const styles = document.createElement('div')
      styles.setAttribute('role', 'group')
      styles.append(heading1, heading2, heading3, bulletedList, numberedList)

      toolbar.append(formatting, styles)

      editor.on('transaction', () => {
        bold.setAttribute('aria-pressed', editor.isActive('bold') ? 'true' : 'false')
        bold.setAttribute('aria-disabled', editor.can().toggleBold() ? 'false' : 'true')
        italic.setAttribute('aria-pressed', editor.isActive('italic') ? 'true' : 'false')
        italic.setAttribute('aria-disabled', editor.can().toggleItalic() ? 'false' : 'true')
        subscript.setAttribute('aria-pressed', editor.isActive('subscript') ? 'true' : 'false')
        subscript.setAttribute(
          'aria-disabled',
          editor.can().toggleSubscript() || editor.can().toggleSuperscript() ? 'false' : 'true',
        )
        superscript.setAttribute('aria-pressed', editor.isActive('superscript') ? 'true' : 'false')
        superscript.setAttribute(
          'aria-disabled',
          editor.can().toggleSuperscript() || editor.can().toggleSubscript() ? 'false' : 'true',
        )
        heading1.setAttribute('aria-pressed', editor.isActive('heading', { level: 1 }) ? 'true' : 'false')
        heading1.setAttribute('aria-disabled', editor.can().toggleHeading({ level: 1 }) ? 'false' : 'true')
        heading2.setAttribute('aria-pressed', editor.isActive('heading', { level: 2 }) ? 'true' : 'false')
        heading2.setAttribute('aria-disabled', editor.can().toggleHeading({ level: 2 }) ? 'false' : 'true')
        heading3.setAttribute('aria-pressed', editor.isActive('heading', { level: 3 }) ? 'true' : 'false')
        heading3.setAttribute('aria-disabled', editor.can().toggleHeading({ level: 3 }) ? 'false' : 'true')
        bulletedList.setAttribute('aria-pressed', editor.isActive('bulletList') ? 'true' : 'false')
        bulletedList.setAttribute(
          'aria-disabled',
          editor.can().toggleBulletList() || editor.can().toggleOrderedList() ? 'false' : 'true',
        )
        numberedList.setAttribute('aria-pressed', editor.isActive('orderedList') ? 'true' : 'false')
        numberedList.setAttribute(
          'aria-disabled',
          editor.can().toggleOrderedList() || editor.can().toggleBulletList() ? 'false' : 'true',
        )
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
