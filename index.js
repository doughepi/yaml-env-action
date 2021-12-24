const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const yaml = require('yaml');
const caseLib = require('case');
const flatten = require('flat');
const deepmerge = require('deepmerge');
const { env } = require('process');

const FILES_INPUT_NAME = "files";
const SPLIT_CHARACTER = " ";
const VALID_EXTENSIONS = ['.yaml', '.yml']
const ENV_DELIMETER = '_';

/**
 * Check for the existence of a file.
 * 
 * @param {string} path The path to the file.
 * @returns True if the file exists, false otherwise.
 */
const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));

/**
 * Split a string containing space-separated file names into an array of file names.
 * 
 * @param {string} str 
 * @returns An array of strings that represent the indvidiual files.
 */
const splitFiles = async str => {
    return str.split(SPLIT_CHARACTER);
}

/**
 * Take a list of objects and merge them into a single object, taking the last value for each key. After merging, 
 * flatten the object and convert all keys to constant-case.
 * 
 * Example:
 * - { a: 1, b: 2 }
 * - { b: 4, c: 3 }
 * 
 * Result:
 * - { A: 1, B: 4, C: 3 }
 * 
 * Or for a more complex example:
 * - { name: 'application', bucket: 'f46cc6e2-86e3-428d-b266-612d7913ef2d'}
 * - { name: 'application-dev', webService: { dns: 'my-d.webservice.com' }, apiService: { dns: 'my-d.apiservice.com' } }
 * 
 * Result:
 * - { NAME: 'application-dev', BUCKET: 'f46cc6e2-86e3-428d-b266-612d7913ef2d', WEB_SERVICE_DNS: 'my-d.webservice.com', API_SERVICE_DNS: 'my-d.apiservice.com' }
 * 
 * @param {Object[]} objs A list of objects to merge.
 * @returns The merged object.
 */
const getEnvironment = async objs => {
    if (!Array.isArray(objs)) {
        return {};
    }

    let environment = {}
    objs.forEach((obj) => {
        environment = deepmerge(environment, obj, {
            arrayMerge: (_destinationArray, sourceArray) => {
                return sourceArray
            }
        });
    })

    environment = flatten(environment, {
        delimiter: ENV_DELIMETER,
        transformKey: (key) => caseLib.constant(key)
    });

    return environment;
};

/**
 * Run the action process by reading the files, merging them into a single environment, and then setting the environment variables.
 */
const run = async () => {
    try {
        const rawFileNames = core.getInput(FILES_INPUT_NAME);
        core.debug(`Files: ${rawFileNames}`);

        const splitFileNames = await splitFiles(rawFileNames);
        core.debug(`Split files: ${splitFileNames}`);

        const environments = [];
        splitFileNames.forEach(fileName => {
            core.debug(`Processing file: ${fileName}`);

            let exists = await fileExists(fileName);
            core.debug(`File ${fileName} exists: ${exists}`);

            if (!exists) {
                throw Error(`File does not exist: ${fileName}`)
            }

            core.debug(`Loading file ${fileName}`);
            let fileEnvironment = yaml.parse(fs.readFileSync(fileName, 'utf8'));
            core.debug(`File content: ${JSON.stringify(fileEnvironment)}`);

            environments.push(fileEnvironment);
        })

        core.debug(`Successfuly loaded ${environments.length} files`);
        core.debug(`Now merging ${environments.length} files`);

        const resultingEnvironment = await getEnvironment(environments);

        Object.keys(resultingEnvironment).forEach(key => {
            core.exportVariable(key, resultingEnvironment[key]);
            core.info(`Set environment variable ${key} to ${resultingEnvironment[key]}`);
        });
    } catch (error) {
        core.setFailed(error);
    }
};

run()

module.exports = {
    splitFiles,
    getEnvironment
}