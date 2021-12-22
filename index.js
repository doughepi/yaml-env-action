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
const VALID_EXTENSIONS = /(\.yml|\.yaml)$/i
const ENV_DELIMETER = '_';

/**
 * 
 * @param {string} path 
 * @returns 
 */
const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));

/**
 * Split a string containing space-separated file names into an array of file names.
 * 
 * @param {string} str 
 * @returns An array of strings that represent the indvidiual files.
 */
const splitFiles = async str => {

    if (str === null || str === undefined || str === '') {
        return [];
    }

    return str.split(SPLIT_CHARACTER);
}

/**
 * 
 * @param {string} file 
 * @returns 
 */
const verifyExtension = async file => VALID_EXTENSIONS.test(file);

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
 * @param {Object[]} objs 
 * @returns 
 */
const getEnvironment = async objs => {
    if (!Array.isArray(objs)) {
        return {};
    }

    let environment = {}
    objs.forEach((obj) => {
        environment = deepmerge(environment, obj, { arrayMerge: (_destinationArray, sourceArray) => sourceArray });
    })

    environment = flatten(environment, {
        delimiter: ENV_DELIMETER,
        transformKey: (key) => caseLib.constant(key)
    });

    return environment;
};

/**
 * 
 */
const run = async () => {
    try {
        const rawFileNames = core.getInput(FILES_INPUT_NAME);

        const environments = [];
        const splitFileNames = await splitFiles(rawFileNames);
        for (let fileName in splitFileNames) {

            let isValidExtension = verifyExtension(fileName);
            let exists = await fileExists(fileName);

            if (isValidExtension && exists) {
                let fileEnvironment = yaml.parse(fs.readFileSync(fileName, 'utf8'));
                environments.push(fileEnvironment);
            }
        }

        const resultingEnvironment = getEnvironment(environments);
        
        Object.keys(resultingEnvironment).forEach(key => {
            core.exportVariable(key, resultingEnvironment[key]);
        });
    } catch (error) {
        core.setFailed(error.message);
    }
};

run()

module.exports = {
    splitFiles,
    verifyExtension,
    getEnvironment
}