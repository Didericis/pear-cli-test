import test from 'brittle';
// import sinon from 'sinon';

import program from './program.js';


test('prints version information when no arguments given', function (t) {
    // const writeOut = sinon.fake();
    // const writeErr = sinon.fake();
    // program.configureOutput({ writeOut, writeErr })
    program.parse(['node', '.']);
    t.ok(writeOut.calledWith('blah'));
});