'use strict'

module.exports = {
  root: true,

  parserOptions: {
    project: require('path').join(__dirname, 'tsconfig-eslint.json'),
  },

  extends: [
    'standard-with-typescript',
    'plugin:react/recommended',
    'prettier',
    'plugin:json/recommended',
    'plugin:storybook/recommended',
    'plugin:react/jsx-runtime',
  ],

  plugins: ['react', 'react-hooks', 'json', 'testing-library', 'opentrons'],

  rules: {
    camelcase: 'off',
    'no-var': 'error',
    'prefer-const': 'error',
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-extra-boolean-cast': 'off',
    'import/no-default-export': 'error',
    '@typescript-eslint/promise-function-async': 'off',
    '@typescript-eslint/default-param-last': 'off',

    // TODO(mc, 2021-01-29): fix these and remove warning overrides
    'lines-between-class-members': 'warn',
    'array-callback-return': 'warn',
    'no-prototype-builtins': 'warn',
    'no-import-assign': 'warn',
    'default-case-last': 'warn',
    'no-case-declarations': 'warn',
    'prefer-regex-literals': 'warn',
    'react/prop-types': 'warn',
    'react/jsx-curly-brace-presence': 'warn',

    // Enforce notification hooks
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@opentrons/react-api-client',
            importNames: [
              'useAllRunsQuery',
              'useRunQuery',
              'useAllCommandsQuery',
              'useCurrentMaintenanceRun',
              'useDeckConfigurationQuery',
              'useAllCommandsAsPreSerializedList',
            ],
            message:
              'HTTP hook deprecated. Use the equivalent notification wrapper (useNotifyXYZ).',
          },
        ],
      },
    ],
  },

  globals: {},

  env: {
    node: true,
    browser: true,
  },

  settings: {
    react: {
      version: '17.0.1',
    },
  },

  overrides: [
    {
      files: ['**/*.js'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      parserOptions: {
        project: require('path').join(__dirname, 'tsconfig-eslint.json'),
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
      },
    },
    {
      // TODO(mc, 2021-03-18): remove to default these rules back to errors
      files: ['**/*.@(ts|tsx)'],
      rules: {
        '@typescript-eslint/strict-boolean-expressions': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/restrict-plus-operands': 'warn',
        '@typescript-eslint/restrict-template-expressions': 'warn',
        '@typescript-eslint/naming-convention': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
        '@typescript-eslint/consistent-indexed-object-style': 'warn',
        '@typescript-eslint/ban-types': 'warn',
        '@typescript-eslint/non-nullable-type-assertion-style': 'warn',
        '@typescript-eslint/await-thenable': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/unbound-method': 'warn',
        '@typescript-eslint/consistent-generic-constructors': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        // need this to be able to pass in css prop into raw elements (babel adds this at build time for styled-components)
        'react/no-unknown-property': [
          'error',
          { ignore: ['css', 'indeterminate'] },
        ],
      },
    },
    {
      files: ['./app/src/**/*.@(ts|tsx)'],
      rules: {
        'import/no-absolute-path': 'off',
      },
    },
    {
      files: [
        '**/test/**.js',
        '**/__tests__/**.@(js|ts|tsx)',
        '**/__mocks__/**.@(js|ts|tsx)',
        '**/__utils__/**.@(js|ts|tsx)',
        '**/__fixtures__/**.@(js|ts|tsx)',
        '**/fixtures/**.@(js|ts|tsx)',
        'scripts/*.@(js|ts|tsx)',
        '**/**test.@(js|ts|tsx)',
      ],
      rules: {
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'warn',
        'node/handle-callback-err': 'off',
      },
    },
    {
      files: ['**/__tests__/**test.tsx'],
      extends: ['plugin:testing-library/react'],
    },
    {
      files: ['**/*.stories.tsx'],
      rules: {
        'import/no-default-export': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
      },
    },
    {
      files: ['**/cypress/**'],
      extends: ['plugin:cypress/recommended'],
      rules: {
        'cypress/unsafe-to-chain-command': 'warn',
      },
    },
    // Allow HTTP hooks in notification wrappers and tests
    {
      files: ['app/src/resources/**', '**/__tests__/**test**'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    // Apply tree-of-life import requirements to app as errors
    {
      files: ['./app/src/**/*.@(ts|tsx)'],
      rules: {
        'opentrons/no-imports-up-the-tree-of-life': 'error',
      },
    },
    {
      files: ['./protocol-designer/src/**/*.@(ts|tsx)'],
      rules: {
        'opentrons/no-imports-up-the-tree-of-life': 'warn',
        'opentrons/no-margins-in-css': 'warn',
        'opentrons/no-margins-inline': 'warn',
      },
    },
    // apply application structure import requirements to app
    {
      files: ['./app/src/**/*.@(ts|tsx)'],
      rules: {
        'opentrons/no-imports-across-applications': 'error',
        'opentrons/no-margins-in-css': 'warn',
        'opentrons/no-margins-inline': 'warn',
      },
    },
    {
      files: ['./opentrons-ai-client/src/**/*.@(ts|tsx)'],
      rules: {
        'opentrons/no-imports-up-the-tree-of-life': 'warn',
        'opentrons/no-margins-in-css': 'warn',
        'opentrons/no-margins-inline': 'warn',
      },
    },
    {
      files: ['./components/src/**/*.@(ts|tsx)'],
      rules: {
        'opentrons/no-margins-in-css': 'warn',
        'opentrons/no-margins-inline': 'warn',
      },
    },
  ],
}
