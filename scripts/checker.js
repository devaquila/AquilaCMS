const fs     = require('fs');
const path   = require('path');
const {exec} = require('child_process');

let lang = 'fr';
// eslint-disable-next-line
const [nodePath, filePath, ...args] = process.argv;

if (args) {
    for (const oneArgs of args) {
        if (oneArgs.includes('lang=')) {
            lang = oneArgs.split('=')[1];
        }
    }
}
console.log(`Selected language: ${lang}`);
console.log('---------');

const main = async () => {
    global.appRoot = path.resolve(__dirname, '../');
    await translationsCheck();

    console.log('---------');

    // check external dependencies
    for (const oneCmd of  ['yarn', 'npm', 'git', 'mongodump', 'mongorestore', 'wkhtmltopdf']) {
        await testCommand(`${oneCmd} --version`, `${oneCmd} installed :`, `${oneCmd} not installed`, true);
    }
};

const testCommand = async (cmd, sucess, bug, showReturn = false, pathTo = global.appRoot) => {
    try {
        const test = await execCmd(cmd, pathTo);
        console.log(sucess);
        if (showReturn && test.stdout) {
            console.log(test.stdout);
        }
        return test;
    } catch (e) {
        console.error(bug);
        return null;
    }
};

const compareObject = (obj1, obj2, pathToError = '') => {
    let smaller;
    let bigger;
    if (Object.keys(obj1).length < Object.keys(obj2).length) {
        smaller = obj2;
        bigger  = obj1;
    } else {
        smaller = obj1;
        bigger  = obj2;
    }
    for (const oneEntries of Object.keys(smaller)) {
        const newPath = pathToError.endsWith('>') ? `${pathToError} ${oneEntries}` : `${pathToError}.${oneEntries}`;
        if (typeof smaller[oneEntries] === 'object') {
            if (typeof bigger[oneEntries] === 'object') {
                compareObject(smaller[oneEntries], bigger[oneEntries], newPath);
            }
        } else if (typeof bigger[oneEntries] === 'undefined') {
            console.log(newPath);
        }
    }
};

const translationsCheck = async () => {
    const pathToTranslations = path.join(global.appRoot, 'backoffice', 'assets',  'translations');
    const allTranslations    = (await fs.promises.readdir(pathToTranslations)).filter((el) => el.length === 2 && el !== lang);
    const allFiles           = await fs.promises.readdir(path.join(pathToTranslations, lang));
    for (const oneLang of allTranslations) {
        console.log(`check between ${lang} <=> ${oneLang}`);
        for (const oneFile of allFiles) {
            const path1 = path.join(pathToTranslations, lang, oneFile );
            const path2 = path.join(pathToTranslations, oneLang, oneFile );
            if (fs.existsSync(path2)) {
                const obj1 = require(path1);
                const obj2 = require(path2);
                compareObject(obj1, obj2, `[${oneFile}]=>`);
            } else {
                console.error(`file "${oneLang}/${oneFile}" not found`);
            }
        }
    }
};

const execCmd = async (cde, path = global.appRoot) => new Promise((resolve, reject) => {
    exec(cde, {cwd: path, maxBuffer: 1024 * 500}, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            reject(err);
        }
        resolve({stdout, stderr});
    });
});

main();