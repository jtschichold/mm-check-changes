import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'

test('test runs', () => {
    process.env['INPUT_PATH'] = '.'
    const mainscript = path.join(__dirname, '..', 'lib', 'main.js')
    const options: cp.ExecSyncOptions = {
        env: process.env
    }

    console.log(cp.execSync(`node ${mainscript}`, options).toString())
})
