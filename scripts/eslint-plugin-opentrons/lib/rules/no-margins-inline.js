module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of margin-related styles',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      noMarginInline: "Avoid using '{{property}}' in your components.",
    },
    schema: [],
  },
  create(context) {
    const forbiddenMargins = [
      'margin',
      'marginLeft',
      'marginRight',
      'marginTop',
      'marginBottom',
      'marginX',
      'marginY',
    ]

    return {
      // Existing visitor for object properties
      Property(node) {
        if (forbiddenMargins.includes(node.key.name || node.key.value)) {
          context.report({
            node: node.key,
            messageId: 'noMarginInline',
            data: {
              property: node.key.name || node.key.value,
            },
          })
        }
      },
      // New visitor for JSX attributes
      JSXAttribute(node) {
        if (forbiddenMargins.includes(node.name.name)) {
          context.report({
            node: node.name,
            messageId: 'noMarginInline',
            data: {
              property: node.name.name,
            },
          })
        }
      },
    }
  },
}
