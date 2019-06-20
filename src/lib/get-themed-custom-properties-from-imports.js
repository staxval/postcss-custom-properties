import fs from 'fs';
import path from 'path';
import { parse } from 'postcss-values-parser';

/* Get Custom Properties from Object
/* ========================================================================== */

function getThemedCustomPropertiesFromObject(object) {
	const themedCustomProperties = Object.assign(
		{},
		Object(object).themedCustomProperties,
		Object(object)['themed-custom-properties']
	);

	for (const key in themedCustomProperties) {
		for (const themeKey in themedCustomProperties[key]) {
			themedCustomProperties[key][themeKey] = parse(
				String(themedCustomProperties[key][themeKey])
			).nodes;
		}
	}

	return themedCustomProperties;
}

/* Get Custom Properties from JSON file
/* ========================================================================== */

async function getThemedCustomPropertiesFromJSONFile(from) {
	const object = await readJSON(from);

	return getThemedCustomPropertiesFromObject(object);
}

/* Get Custom Properties from JS file
/* ========================================================================== */

async function getThemedCustomPropertiesFromJSFile(from) {
	const object = await import(from);

	return getThemedCustomPropertiesFromObject(object);
}

/* Get Custom Properties from Imports
/* ========================================================================== */

export default function getThemedCustomPropertiesFromImports(sources) {
	return sources
		.map(source => {
			if (source instanceof Promise) {
				return source;
			} else if (source instanceof Function) {
				return source();
			}

			// read the source as an object
			const opts =
				source === Object(source) ? source : { from: String(source) };

			// skip objects with Custom Properties
			if (opts.themedCustomProperties || opts['themed-custom-properties']) {
				return opts;
			}

			// source pathname
			const from = path.resolve(String(opts.from || ''));

			// type of file being read from
			const type = (opts.type || path.extname(from).slice(1)).toLowerCase();

			return { type, from };
		})
		.reduce(async (themedCustomProperties, source) => {
			const { type, from } = await source;

			if (type === 'js') {
				return Object.assign(
					await themedCustomProperties,
					await getThemedCustomPropertiesFromJSFile(from)
				);
			}

			if (type === 'json') {
				return Object.assign(
					await themedCustomProperties,
					await getThemedCustomPropertiesFromJSONFile(from)
				);
			}

			return Object.assign(
				await themedCustomProperties,
				await getThemedCustomPropertiesFromObject(await source)
			);
		}, {});
}

/* Helper utilities
/* ========================================================================== */

const readFile = from =>
	new Promise((resolve, reject) => {
		fs.readFile(from, 'utf8', (error, result) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});

const readJSON = async from => JSON.parse(await readFile(from));
