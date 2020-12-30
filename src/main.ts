import * as core from '@actions/core'
import * as fs from 'fs'
import {createCommandManager} from './git-command-manager'

interface ActionInputs {
    path: string
}

function parseInputs(): ActionInputs {
    const result: ActionInputs = {
        path: core.getInput('path') || '.'
    }

    // validate path
    let stats: fs.Stats
    try {
        stats = fs.statSync(result.path)
    } catch (error) {
        throw new Error(`Error checking path ${result.path}: ${error.message}`)
    }
    if (!stats.isDirectory()) {
        throw new Error(`Path ${result.path} is not a directory`)
    }

    return result
}

async function run(): Promise<void> {
    try {
        const inputs = parseInputs()

        const gitCommandManager = await createCommandManager(inputs.path)

        const numOfLines = await gitCommandManager.numberOfLines()
        core.debug(`Number of lines: ${numOfLines}`)
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
