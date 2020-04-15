const { GraphQLJSON } = require('gatsby/graphql')
const sanitizeHtml = require('sanitize-html')
const styler = require('react-styling')
const HtmlToReactParser = require('html-to-react').Parser
const htmlToReactParser = new HtmlToReactParser()

const { TYPE_PREFIX_COCKPIT } = require('./src/constants')

module.exports = async ({ type }) => {
  if (!type.name.startsWith(TYPE_PREFIX_COCKPIT)) {
    return {}
  }

  const parseLayout = layout => {
    if (layout == null || layout.length === 0) {
      return layout
    }

    return layout.map(node => {
      if (node.settings) {
        node = parseSettings(node)
      }
      Object.entries(node).forEach(([key, value]) => {
        if (value instanceof Array) {
          parseLayout(node[key])
        }
        if (value instanceof Object && node[key].settings) {
          node[key].settings = parseSettings(node.settings)
        }
      })
      return node
    })
  }
  const parseHtml = (type, node) => {
    const { settings } = node
    if (settings[type] === '') {
      node.settings.html = null
    } else if (settings[type] && settings[type].length > 0) {
      node.settings.html = settings[type]
      node.settings.html_sanitize = sanitizeHtml(settings[type], {})
      node.settings.html_react = htmlToReactParser.parse(settings[type])
    }
    return node
  }

  const parseSettings = node => {
    const { settings } = node
    if (settings.html) {
      node = parseHtml('html', node)
    }
    if (settings.text) {
      node = parseHtml('text', node)
    }
    if (settings.id === '') {
      settings.id = null
    }
    if (settings.class === '') {
      settings.className = null
    } else {
      settings.className = settings.class
    }
    delete settings.class
    if (settings.style === '' || settings.style == null) {
      settings.style = null
    } else {
      settings.style = styler(settings.style)
    }
    return node
  }

  let nodeExtendType = {}

  if (type.name === 'CockpitLayoutNode') {
    nodeExtendType['parsed'] = {
      type: GraphQLJSON,
      resolve(Item) {
        return parseLayout(JSON.parse(Item.internal.content))
      },
    }
  } else if (type.name === 'CockpitObjectNode') {
    nodeExtendType['data'] = {
      type: GraphQLJSON,
      resolve(Item) {
        return JSON.parse(Item.internal.content)
      },
    }
  }

  return nodeExtendType
}
