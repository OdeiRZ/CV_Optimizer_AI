import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['vendor/**', 'node_modules/**', 'public/build/**', 'bootstrap/ssr/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat['jsx-runtime'],
    jsxA11y.flatConfigs.recommended,
    {
        files: ['resources/js/**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': reactHooks,
        },
        languageOptions: {
            globals: globals.browser,
        },
        settings: {
            react: {
                version: '18.2',
            },
            'jsx-a11y': {
                // Checkbox/TextInput are thin wrappers that forward all props
                // straight onto a native <input>, so jsx-a11y's label/form
                // rules should treat them exactly like one.
                components: {
                    Checkbox: 'input',
                    TextInput: 'input',
                },
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // Inertia pages export a `layout` property assigned onto the
            // component function, so PropTypes don't apply and TS already
            // covers prop types.
            'react/prop-types': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
);
