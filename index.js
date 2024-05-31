import process from 'bare-process';
import program from './program';

let args = [];
if (process.argv.length > 3) {
    args = process.argv.splice(3, process.argv.length - 3);
}

program.parse(['node', './index.js'].concat(args));