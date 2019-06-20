import postcss from 'postcss';
import getCustomPropertiesFromRoot from './lib/get-custom-properties-from-root';
import getCustomPropertiesFromImports from './lib/get-custom-properties-from-imports';
import getThemedCustomPropertiesFromImports from './lib/get-themed-custom-properties-from-imports';
import { transformProperties } from './lib/transform-properties';
import writeCustomPropertiesToExports from './lib/write-custom-properties-to-exports';

export default postcss.plugin('postcss-custom-properties', opts => {
	// whether to preserve custom selectors and rules using them
	const preserve = 'preserve' in Object(opts) ? Boolean(opts.preserve) : true;

	// themes
	const themes =
		'themes' in Object(opts) && Array.isArray(opts.themes) ? opts.themes : [];

	const useThemes = Boolean(themes.length);

	// sources to import custom selectors from
	const importFrom = [].concat(Object(opts).importFrom || []);

	// destinations to export custom selectors to
	const exportTo = [].concat(Object(opts).exportTo || []);

	// promise any custom selectors are imported
	const customPropertiesPromise = getCustomPropertiesFromImports(importFrom);
	const themedCustomPropertiesPromise =
		getThemedCustomPropertiesFromImports(importFrom) || {};

	// synchronous transform
	const syncTransform = root => {
		const customProperties = getCustomPropertiesFromRoot(root, { preserve });

		transformProperties(root, customProperties, { preserve });
	};

	// asynchronous transform
	const asyncTransform = async root => {
		const defaultCustomProperties = Object.assign(
			{},
			await customPropertiesPromise,
			getCustomPropertiesFromRoot(root, { preserve })
		);
		const themedCustomProperties = Object.assign(
			{},
			{ default: defaultCustomProperties },
			await themedCustomPropertiesPromise,
			getCustomPropertiesFromRoot(root, { preserve })
		);
		const customProperties = useThemes
			? themedCustomProperties
			: defaultCustomProperties;

		await writeCustomPropertiesToExports(customProperties, exportTo);

		transformProperties(root, customProperties, {
			preserve,
			useThemes,
			themes
		});
	};

	// whether to return synchronous function if no asynchronous operations are requested
	const canReturnSyncFunction =
		importFrom.length === 0 && exportTo.length === 0;

	return canReturnSyncFunction ? syncTransform : asyncTransform;
});
