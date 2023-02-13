import boldIcon from 'remixicon/icons/Editor/bold.svg'
import heading1Icon from 'remixicon/icons/Editor/h-1.svg'
import heading2Icon from 'remixicon/icons/Editor/h-2.svg'
import heading3Icon from 'remixicon/icons/Editor/h-3.svg'
import italicIcon from 'remixicon/icons/Editor/italic.svg'
import linkIcon from 'remixicon/icons/Editor/link.svg'
import numberedListIcon from 'remixicon/icons/Editor/list-ordered.svg'
import bulletedListIcon from 'remixicon/icons/Editor/list-unordered.svg'
import subscriptIcon from 'remixicon/icons/Editor/subscript.svg'
import superscriptIcon from 'remixicon/icons/Editor/superscript.svg'

const deps = Promise.all([
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
  }

  async connectedCallback() {
    const textArea = this.firstElementChild

    if (!(textArea instanceof HTMLTextAreaElement)) {
      throw new Error('No text area')
    }

    const form = textArea.form

    if (!(form instanceof HTMLFormElement)) {
      throw new Error('No form')
    }

    form.querySelectorAll('button').forEach(disableButton)
    form.addEventListener('submit', preventDefault)

    const container = document.createElement('div')
    container.setAttribute('aria-busy', 'true')
    container.append(...this.children)
    this.append(container)

    textArea.readOnly = true

    const status = document.createElement('div')
    status.classList.add('loading', 'visually-hidden')
    const statusText = document.createElement('span')
    statusText.textContent = 'Loading'
    status.append(statusText)
    this.append(status)

    setTimeout(() => status.classList.remove('visually-hidden'), 100)

    const toolbar = document.createElement('editor-toolbar')
    toolbar.setAttribute('role', 'toolbar')
    toolbar.setAttribute('aria-controls', textArea.id)
    toolbar.setAttribute('aria-label', 'Formatting')

    const bold = document.createElement('button')
    bold.type = 'button'
    bold.setAttribute('aria-pressed', 'false')
    bold.setAttribute('aria-disabled', 'true')

    const boldImage = document.createElement('img')
    boldImage.alt = 'Bold'
    boldImage.src = boldIcon
    boldImage.width = 24
    boldImage.height = 24
    bold.append(boldImage)

    const italic = document.createElement('button')
    italic.type = 'button'
    italic.setAttribute('aria-pressed', 'false')
    italic.setAttribute('aria-disabled', 'true')

    const italicImage = document.createElement('img')
    italicImage.alt = 'Italic'
    italicImage.src = italicIcon
    italicImage.width = 24
    italicImage.height = 24
    italic.append(italicImage)

    const subscript = document.createElement('button')
    subscript.type = 'button'
    subscript.setAttribute('aria-pressed', 'false')
    subscript.setAttribute('aria-disabled', 'true')

    const subscriptImage = document.createElement('img')
    subscriptImage.alt = 'Subscript'
    subscriptImage.src = subscriptIcon
    subscriptImage.width = 24
    subscriptImage.height = 24
    subscript.append(subscriptImage)

    const superscript = document.createElement('button')
    superscript.type = 'button'
    superscript.setAttribute('aria-pressed', 'false')
    superscript.setAttribute('aria-disabled', 'true')

    const superscriptImage = document.createElement('img')
    superscriptImage.alt = 'Superscript'
    superscriptImage.src = superscriptIcon
    superscriptImage.width = 24
    superscriptImage.height = 24
    superscript.append(superscriptImage)

    const formatting = document.createElement('div')
    formatting.setAttribute('role', 'group')
    formatting.append(bold, italic, subscript, superscript)

    const link = document.createElement('button')
    link.type = 'button'
    link.setAttribute('aria-pressed', 'false')
    link.setAttribute('aria-disabled', 'true')

    const linkImage = document.createElement('img')
    linkImage.alt = 'link'
    linkImage.src = linkIcon
    linkImage.width = 24
    linkImage.height = 24
    link.append(linkImage)

    const heading1 = document.createElement('button')
    heading1.type = 'button'
    heading1.setAttribute('aria-pressed', 'false')
    heading1.setAttribute('aria-disabled', 'true')

    const heading1Image = document.createElement('img')
    heading1Image.alt = 'Heading level 1'
    heading1Image.src = heading1Icon
    heading1Image.width = 24
    heading1Image.height = 24
    heading1.append(heading1Image)

    const heading2 = document.createElement('button')
    heading2.type = 'button'
    heading2.setAttribute('aria-pressed', 'false')
    heading2.setAttribute('aria-disabled', 'true')

    const heading2Image = document.createElement('img')
    heading2Image.alt = 'Heading level 2'
    heading2Image.src = heading2Icon
    heading2Image.width = 24
    heading2Image.height = 24
    heading2.append(heading2Image)

    const heading3 = document.createElement('button')
    heading3.type = 'button'
    heading3.setAttribute('aria-pressed', 'false')
    heading3.setAttribute('aria-disabled', 'true')

    const heading3Image = document.createElement('img')
    heading3Image.alt = 'Heading level 3'
    heading3Image.src = heading3Icon
    heading3Image.width = 24
    heading3Image.height = 24
    heading3.append(heading3Image)

    const bulletedList = document.createElement('button')
    bulletedList.type = 'button'
    bulletedList.setAttribute('aria-pressed', 'false')
    bulletedList.setAttribute('aria-disabled', 'true')

    const bulletedListImage = document.createElement('img')
    bulletedListImage.alt = 'Bulleted list'
    bulletedListImage.src = bulletedListIcon
    bulletedListImage.width = 24
    bulletedListImage.height = 24
    bulletedList.append(bulletedListImage)

    const numberedList = document.createElement('button')
    numberedList.type = 'button'
    numberedList.setAttribute('aria-pressed', 'false')
    numberedList.setAttribute('aria-disabled', 'true')

    const numberedListImage = document.createElement('img')
    numberedListImage.alt = 'Numbered list'
    numberedListImage.src = numberedListIcon
    numberedListImage.width = 24
    numberedListImage.height = 24
    numberedList.append(numberedListImage)

    const styles = document.createElement('div')
    styles.setAttribute('role', 'group')
    styles.append(heading1, heading2, heading3, bulletedList, numberedList)

    toolbar.append(formatting, link, styles)

    container.prepend(toolbar)

    const input = textArea.nextElementSibling instanceof HTMLTextAreaElement ? textArea.nextElementSibling : textArea

    const [{ Editor }, { Link }, { Subscript }, { Superscript }, { Typography }, { StarterKit }] = await deps

    const editor = new Editor({
      editorProps: {
        attributes: {
          'aria-labelledby': replaceLabels(textArea)
            .map(label => label.id)
            .join(' '),
          'aria-multiline': 'true',
          id: textArea.id,
          role: 'textbox',
          ...extractAttributes(textArea, ['aria-describedby', 'aria-errormessage', 'aria-invalid']),
        },
      },
      element: container,
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
      content: new DOMParser().parseFromString(input.innerHTML, 'text/html').documentElement.textContent,
    })

    editor.on('create', () => {
      status.remove()
      container.setAttribute('aria-busy', 'false')
      form.removeEventListener('submit', preventDefault)
      form.querySelectorAll('button').forEach(enableButton)
    })

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
      link.setAttribute('aria-pressed', editor.isActive('link') ? 'true' : 'false')
      link.setAttribute(
        'aria-disabled',
        editor.can().toggleLink({ href: '' }) && (!editor.state.selection.empty || editor.isActive('link'))
          ? 'false'
          : 'true',
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

    bold.addEventListener('click', () => {
      if (bold.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleBold().run()
    })

    italic.addEventListener('click', () => {
      if (italic.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleItalic().run()
    })

    subscript.addEventListener('click', () => {
      if (subscript.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleSubscript().run()
    })

    link.addEventListener('click', () => {
      if (link.getAttribute('aria-disabled') === 'true') {
        return
      }

      if (editor.isActive('link')) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }

      const href = window.prompt('Enter a URL')

      if (!href) {
        return
      }

      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    })

    heading1.addEventListener('click', () => {
      if (heading1.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleHeading({ level: 1 }).run()
    })

    heading2.addEventListener('click', () => {
      if (heading2.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleHeading({ level: 2 }).run()
    })

    heading3.addEventListener('click', () => {
      if (heading3.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleHeading({ level: 3 }).run()
    })

    bulletedList.addEventListener('click', () => {
      if (bulletedList.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleBulletList().run()
    })

    superscript.addEventListener('click', () => {
      if (superscript.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleSuperscript().run()
    })

    numberedList.addEventListener('click', () => {
      if (numberedList.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleOrderedList().run()
    })

    editor.on('create', () => {
      const html = editor.getHTML()

      textArea.innerText = html !== '<p></p>' ? html : ''
    })

    editor.on('update', ({ editor }) => {
      const html = editor.getHTML()

      textArea.innerText = html !== '<p></p>' ? html : ''
    })

    if (textArea.isSameNode(document.activeElement)) {
      editor.commands.focus('start', { scrollIntoView: false })
    }

    container.append(textArea, input)
    textArea.hidden = true
    removeAttributes(textArea, ['aria-describedby', 'aria-errormessage', 'aria-invalid', 'id'])
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

function preventDefault(event: Event) {
  event.preventDefault()
}

function disableButton(button: HTMLButtonElement): void {
  button.disabled = true
}

function enableButton(button: HTMLButtonElement): void {
  button.disabled = false
}
