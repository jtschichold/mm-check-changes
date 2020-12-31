import * as core from '@actions/core'
import * as fs from 'fs'
import {Minimatch, IMinimatch} from 'minimatch'
import {createCommandManager} from './git-command-manager'

interface ActionInputs {
    path: string
    thrNewFiles: number
    thrRemovedFiles: number
    thrRelChanges: number
    thrAbsChanges: number
    includeGlob?: IMinimatch
    excludeGlob?: IMinimatch
}

interface FileStatus {
    fname: string
    isNew?: boolean
    isRemoved?: boolean
    numberOfLines?: number
    added?: number
    deleted?: number
}

function parseInputs(): ActionInputs {
    const result: ActionInputs = {
        path: core.getInput('path') || '.',
        thrNewFiles: parseInt(core.getInput('thrNewFiles') || '1'),
        thrRemovedFiles: parseInt(core.getInput('thrRemovedFiles') || '1'),
        thrRelChanges: parseInt(core.getInput('thrRelChanges') || '100'),
        thrAbsChanges: parseInt(core.getInput('thrAbsChanges') || '0')
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

    const includeGlob = core.getInput('includeGlob')
    if (includeGlob) {
        result.includeGlob = new Minimatch(includeGlob)
    }

    const excludeGlob = core.getInput('excludeGlob')
    if (excludeGlob) {
        result.excludeGlob = new Minimatch(excludeGlob)
    }

    if (isNaN(result.thrNewFiles)) {
        throw new Error(`Invalid thrNewFiles, not a number`)
    }
    if (isNaN(result.thrRemovedFiles)) {
        throw new Error(`Invalid thrRemovedFiles, not a number`)
    }
    if (isNaN(result.thrRelChanges)) {
        throw new Error(`Invalid thrRelChanges, not a number`)
    }
    if (isNaN(result.thrAbsChanges)) {
        throw new Error(`Invalid thrAbsChanges, not a number`)
    }

    return result
}

async function run(): Promise<void> {
    try {
        let newFiles = 0
        let removedFiles = 0
        let maxAbsChange = 0
        let maxRelChange = 0
        const status: FileStatus[] = []

        const inputs = parseInputs()

        const gitCommandManager = await createCommandManager(inputs.path)

        // compute new and removed files
        const treeStatus = await gitCommandManager.status()

        // debug print
        core.debug('Status:')
        for (const e of treeStatus) {
            core.debug(`${e.fname}: ${e.status}`)
        }

        // update status
        for (const fstatus of treeStatus) {
            status.push({
                fname: fstatus.fname,
                isNew: gitCommandManager.isNew(fstatus.status),
                isRemoved: gitCommandManager.isDeleted(fstatus.status)
            })
        }

        // compute number of lines
        const numOfLines = await gitCommandManager.numberOfLines()

        // debug print
        core.debug('Number of lines:')
        for (const e of numOfLines) {
            core.debug(`${e.fname}: ${e.count}`)
        }

        // update status
        for (const fnol of numOfLines) {
            const cstatus = status.find(e => e.fname === fnol.fname)
            if (!cstatus) continue
            cstatus.numberOfLines = fnol.count
        }

        // compute number of changes
        const changes = await gitCommandManager.diffNumStats()

        // debug print
        core.debug('Diff Numstats:')
        for (const e of changes) {
            core.debug(`${e.fname}: ${e.added} ${e.deleted}`)
        }

        // update status
        for (const fchange of changes) {
            const cstatus = status.find(e => e.fname === fchange.fname)
            if (!cstatus) continue
            cstatus.added = fchange.added
            cstatus.deleted = fchange.deleted
        }

        for (const fstatus of status) {
            if (
                inputs.includeGlob &&
                !inputs.includeGlob.match(fstatus.fname)
            ) {
                core.debug(
                    `${fstatus.fname} does not match includeGlob, ignored`
                )
                continue
            }
            if (inputs.excludeGlob && inputs.excludeGlob.match(fstatus.fname)) {
                core.debug(`${fstatus.fname} matches excludeGlob, ignored`)
                continue
            }
            core.info(
                `Analyzing: ${fstatus.fname} - #${
                    fstatus.numberOfLines || '--'
                } ${fstatus.isNew}/${fstatus.isRemoved} ${
                    fstatus.added || '--'
                }/${fstatus.deleted || '--'}`
            )

            if (fstatus.isNew) {
                newFiles++
                continue
            }

            if (fstatus.isRemoved) {
                removedFiles++
                continue
            }

            if (fstatus.added || fstatus.deleted) {
                const numChanges = (fstatus.added || 0) + (fstatus.deleted || 0)
                maxRelChange = !fstatus.numberOfLines
                    ? 100
                    : Math.max(
                          maxRelChange,
                          (numChanges * 100) / fstatus.numberOfLines
                      )
                maxAbsChange = Math.max(maxAbsChange, numChanges)
            }
        }

        let bigChange =
            inputs.thrNewFiles !== 0 && newFiles >= inputs.thrNewFiles
        bigChange ||=
            inputs.thrRemovedFiles !== 0 &&
            removedFiles >= inputs.thrRemovedFiles
        bigChange ||=
            inputs.thrAbsChanges !== 0 && maxAbsChange >= inputs.thrAbsChanges
        bigChange ||=
            inputs.thrRelChanges !== 0 && maxRelChange >= inputs.thrRelChanges

        core.info(`bigChange: ${bigChange}`)
        core.info(`newFiles: ${newFiles}`)
        core.info(`removedFiles: ${removedFiles}`)
        core.info(`maxAbsChange: ${maxAbsChange}`)
        core.info(`maxRelChange: ${maxRelChange}`)

        core.setOutput('bigChange', bigChange)
        core.setOutput('newFiles', newFiles)
        core.setOutput('removedFiles', removedFiles)
        core.setOutput('maxAbsChange', maxAbsChange)
        core.setOutput('maxRelChange', maxRelChange)
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
