#!/usr/bin/env node

const fs = require("fs");
const path = require('path');

const usageDescription = "ln3scan [scan_directory] [--output <output_directory>] [--file <setup_module_name>]"

const options = [
    {
        long: "--output",
        short: "-o",
        shortDescription: "[--output <output_directory>]",
        description: 
            "sets the output directory, i.e. the place where the resulting ln3 configuration module is to be stored \n"+
            "                and where the language JSON files are kept",
        arguments: 1,
        processor: (argument) => {
            outDir = argument + "";
            if (!outDir.endsWith(sep)) {
                outDir += sep;
            }
        }
    },
    {
        long: "--file",
        short: "-f",
        shortDescription: "[--file <setup_module_name>]",
        description: 
            "sets the name of the resulting module as it will be used in the target project",
        arguments: 1,
        processor: (argument) => {
            outFilename = argument + "";
            if (outFilename.indexOf(sep) < 0) {
                outFilename = outDir + outFilename;
            }
        }
    },
    {
        isSingleHandler: true,
        processor: (argument) => {
            startDir = argument + "";
            if (!startDir.endsWith(sep)) {
                startDir += sep;
            }
        }
    },
    {
        long: "--help",
        short: "-h",
        isHelp: true
    }
];

let scanLevel = 0;

const newStringStart = '!!';

const sep = path.sep;

let startDir = '.' + sep;

let outDir = '.' + sep + 'ln3' + sep; 

let outFilename = outDir + 'ln3setup.js';

// todo: command line argument processing should be delivered as a separate module

let processArguments = (argv, startIndex, options) => {
    let i = startIndex;
    
    const singleHandler = options.find(o => ((o.isSingleHandler || o.singleHandler) && o.processor));

    while (i < argv.length) {
        let s = argv[i++];
        let o = null;

        let sLower = s.toLowerCase();

        if (s.startsWith("--")) {
            o = options.find( o => (o.long === sLower) );
        } else if (s.startsWith("-")) {
            o = options.find( o => (o.short === sLower) );
        } else {
            o = singleHandler;
        }

        if (o) {
            let arguments = [];
            let count = o.arguments;
            if (count > 0) {
                while (count > 0 && i < argv.length) {
                    arguments.push( argv[i++] );
                    count--;
                }
                if (count > 0) {
                    console.error("Invalid number of arguments for option ", s);
                    process.exit(1);
                }
            } 
                
            arguments.push(s);
            
            if (o.isHelp) {
                console.log("Usage: ", usageDescription, "\n\nAvailable options: ");

                let optionCount = 0;

                options.forEach(o => {
                    if (o.description) {
                        let d = o.long;

                        if (!d) d = "";

                        d += ((o.short) ? (", " + o.short) : "") + "  ";

                        while (d.length < 16) d += " ";

                        console.log(d + o.description);
                    } 
                });

                process.exit();

            } else {
                if (o.processor) {
                    if (o.arguments === 1 || o === singleHandler) {
                        o.processor(arguments[0], o)
                    } else {
                        o.processor(arguments, o);
                    }
                }
            }

        } else {
            console.warn("Unknown option: ", s);
        }
    }
};

processArguments(process.argv, 2, options);

console.log("Scan directory: ", startDir);
console.log("Output directory: ", outDir);
console.log("Output module name: ", outFilename);

// ---------------------------------------------------------------------------------

const translations = {};

const fileMask = /\.js$/u;
const jsonFileMask = /\.json$/u;

const scanDir = (path) => {
    const files = fs.readdirSync(path);
    
    if (files) {
        files.forEach(f => {
            if (!f.startsWith('.') && f !== 'node_modules' && f !== 'ln3') {
                const stats = fs.statSync(path + f);

                if (stats.isDirectory()) {
                    scanDir(path + f + sep);
                } else {
                                        
                    if (fileMask.test(f)) {
                        console.log("scanning file --- ", path + f);

                        const buf = fs.readFileSync(path + f);

                        if (buf) {
                            const text = buf.toString();
                            
                            const ln3TextMask = /ln3\.text.\s*"(.*)",\s*"(.*)"/ug;

                            let match, count = 0;
                            
                            while (match = ln3TextMask.exec(text)) {
                                count++;
                                translations[match[1]] = match[2];
                            }
                            
                            const ln3FormatMask = /"format\.(.*)",\s*"(.*)"/ug;

                            while (match = ln3FormatMask.exec(text)) {
                                count++;
                                translations['format.'+match[1]] = match[2];
                            }

                            if (count === 0) {
                                console.log("no match");    
                            } else {
                                console.log("Total matches: ", count);    
                            }
                            
                        } else {
                            console.log("no buf");
                        }
                    }
                }

            }
        });
    }
}

scanDir(startDir);

const sortObject = (object) => {
    var sortedObj = {},
        keys = Object.keys(object);

    keys.sort((key1, key2) => {
        if (key1 === key2) return 0;
        if (key1 < key2) return -1;
        return 1;
    });

    for(var index in keys){
        var key = keys[index];
        if(typeof object[key] === 'object' && !(object[key] instanceof Array)){
            sortedObj[key] = sortObject(object[key]);
        } else {
            sortedObj[key] = object[key];
        }
    }

    return sortedObj;
}

const beautify = require("json-beautify");

const beautyObject = obj => beautify(sortObject(obj), null, 4, 80);

const makeUpJson = obj => new Buffer(beautyObject(obj));

const buffer = makeUpJson(translations);

try {
    fs.mkdirSync(outDir);
} catch (e) {
    if (e.code === "EEXIST") {
        console.log("Output dir already exists - ", outDir);
    }
    // console.log(e);
}

const defaultJson = 'default.json';
fs.writeFileSync(outDir + defaultJson, buffer);

const files = fs.readdirSync(outDir);
const defaultJsonUpper = defaultJson.toUpperCase();


let ln3text = 'import ln3 from "ln3";\n\n'+
    '// IMPORTANT: this file is automatically generated, do not modify it unless you are sure in what you are doing!\n' + 
    '// (normally, language strings are changed by modifying corresponding .JSON files)\n\n' +
    'ln3.setLanguages({\n    default: ' + beautyObject(translations); 

if (files) {

    files.forEach(fileName => {

        console.log("Updating " + fileName, jsonFileMask.test(fileName), fileName.localeCompare('default.json'));

        if (jsonFileMask.test(fileName) && fileName.toUpperCase() !== defaultJsonUpper ) {

            const buffer = fs.readFileSync(outDir + fileName);
            
            let lng = null;
            try {
                if (buffer) {
                    lng = JSON.parse(buffer.toString());
                } 
            } catch(e) {
                // ... simply skip JSON error
            }
            
            if (!lng) lng = {};

            let i, s;

            for (i in translations) {
                s = lng[i];
                
                if (typeof s === 'undefined' || s.startsWith(newStringStart)) {
                    lng[i] = newStringStart + translations[i];
                } 
            }

            
            fs.writeFileSync(outDir + fileName, makeUpJson(lng));

            for (i in lng) {
                s = lng[i];
                if (typeof s === 'string' && s.startsWith(newStringStart)) {
                    lng[i] = s.substr(newStringStart.length);
                }
            }

            ln3text += ',\n"' + fileName.substr(0, fileName.length - 5) + '": ' + beautyObject(lng);
        }

    });
}

ln3text += '});';

fs.writeFileSync(outFilename, new Buffer(ln3text));



