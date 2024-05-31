import { Command } from 'commander';
import process from 'bare-process';

const program = new Command();

program
    .name('diurnum')
    .description('CLI to edit diurnum items')
    .version('1.0.0');

program.command('test')
    .description('prints configuration information')
    .action(async () => {
        console.log('TEST');
        process.exit(0);
    });

export default program;