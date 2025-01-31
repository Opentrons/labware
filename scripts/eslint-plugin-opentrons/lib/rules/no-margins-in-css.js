module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of margin-related properties in css-in-js',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      noMarginInCssInJs: "Avoid using '{{property}}' in css-in-js.",
    },
  },
  create(context) {
    return {
      // Check for CSS-in-JS template literals
      TaggedTemplateExpression(node) {
        const forbiddenMargins = [
          'margin',
          // 'margin-top',
          // 'margin-left',
          // 'margin-right',
          // 'margin-bottom',
        ]

        if (node.tag.type === 'Identifier' && node.tag.name === 'css') {
          const templateLiteral = node.quasi
          templateLiteral.quasis.forEach(quasi => {
            const text = quasi.value.raw
            forbiddenMargins.forEach(property => {
              const regex = new RegExp(`\\b${property}\\b`, 'i')
              if (regex.test(text)) {
                context.report({
                  node: quasi,
                  messageId: 'noMarginInCssInJs',
                  data: {
                    property,
                  },
                })
              }
            })
          })
        }
      },
    }
  },
}
