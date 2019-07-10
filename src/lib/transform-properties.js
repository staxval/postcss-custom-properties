import { parse } from 'postcss-values-parser';
import transformValueAST from './transform-value-ast';
import { isRuleIgnored } from './is-ignored';

export function transformProperties(root, customProperties, opts) {
	if (opts.useThemes) {
		insertThemedRules(root, opts);
		transform(root, customProperties, {
			...opts,
			themeName: 'default',
			themes: opts.themes
		});
		opts.themes.forEach(themeName => {
			transform(root, customProperties, {
				...opts,
				themeName,
				themes: opts.themes
			});
		});
	} else {
		transform(root, customProperties, opts);
	}
}

const isThemedRule = (rule, themes = []) =>
	Boolean(themes.filter(theme => rule.selector.includes(theme)).length);

const ruleExists = (selector, root) =>
	root.nodes.some(rule => rule.selector === selector);

// transform custom pseudo selectors with custom selectors

const insertThemedRules = (root, opts) => {
	root.walkRules(rule => {
		if (Array.isArray(opts.themes) && opts.themes.length > 0) {
			opts.themes.forEach(theme => {
				const newSelector = `div.${theme} ${rule.selector}`;
				if (
					!isThemedRule(rule, opts.themes) &&
					!ruleExists(newSelector, root)
				) {
					rule.cloneBefore({
						selector: newSelector
					});
				}
			});
		}
	});
};

const declExists = decl => {
	return (
		decl.parent.some(existingDecl => decl.value === existingDecl.value) && false
	);
};

const isCurrentTheme = (decl, currentThemeName, themes) => {
	const selector = decl.parent.selector;
	if (!currentThemeName || !Array.isArray(themes)) {
		return true;
	} else if (currentThemeName === 'default') {
		return !themes.filter(themeName => selector.includes(themeName)).length;
	}
	return selector.includes(currentThemeName);
};

const transform = (root, customProperties, opts) => {
	let themedCustomProperties = customProperties;
	if ('themeName' in opts) {
		themedCustomProperties = customProperties[opts.themeName];
	}
	// walk decls that can be transformed
	root.walkDecls(decl => {
		if (isTransformableDecl(decl) && !isRuleIgnored(decl)) {
			const originalValue = decl.value;
			const valueAST = parse(originalValue);
			const value = String(transformValueAST(valueAST, themedCustomProperties));

			// conditionally transform values that have changed
			// @todo: if themed - insert only into themed rule
			if (
				value !== originalValue &&
				!declExists(decl) &&
				isCurrentTheme(decl, opts.themeName, opts.themes)
			) {
				if (opts.preserve) {
					decl.cloneBefore({ value });
				} else {
					decl.value = value;
				}
			}
		}
	});
};

// match custom properties
const customPropertyRegExp = /^--[A-z][\w-]*$/;

// match custom property inclusions
const customPropertiesRegExp = /(^|[^\w-])var\([\W\w]+\)/;

// whether the declaration should be potentially transformed
const isTransformableDecl = decl =>
	!customPropertyRegExp.test(decl.prop) &&
	customPropertiesRegExp.test(decl.value);
