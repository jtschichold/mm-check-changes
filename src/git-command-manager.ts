// simplified version of git-command-manager from actions/checkout

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'

export interface IGitCommandManager {
    numberOfLines(ref?: string): Promise<{fname: string; count: number}[]>
    status(): Promise<{fname: string; status: string}[]>
    diffNumStats(): Promise<{fname: string; added: number; deleted: number}[]>
    isNew(porcelainStatus: string): boolean
    isDeleted(porcelainStatus: string): boolean
}

export async function createCommandManager(
    workingDirectory: string
): Promise<IGitCommandManager> {
    return await GitCommandManager.createCommandManager(workingDirectory)
}

class GitCommandManager {
    private gitEnv: {[key: string]: string} = {
        GIT_TERMINAL_PROMPT: '0', // Disable git prompt
        GCM_INTERACTIVE: 'Never' // Disable prompting for git credential manager
    }
    private gitPath = ''
    private workingDirectory = ''

    // Private constructor; use createCommandManager()
    private constructor() {}

    static async createCommandManager(
        workingDirectory: string
    ): Promise<GitCommandManager> {
        const result = new GitCommandManager()
        await result.initializeCommandManager(workingDirectory)
        return result
    }

    async numberOfLines(
        ref?: string
    ): Promise<{fname: string; count: number}[]> {
        const emptyTreeHashID = await this.getEmptyTreeHashID()

        const gitResult = await this.execGit(
            ['diff', '--stat', emptyTreeHashID, ref || 'HEAD'],
            false
        )

        const result = gitResult.stdout
            .split('\n')
            .filter(l => l.includes('|'))
            .map(l => {
                const toks = l.trim().split('|')

                return {
                    count: parseInt(
                        toks.splice(-1, 1)[0].trim().split(/\s+/, 2)[0]
                    ),
                    fname: toks.join('|').trim()
                }
            })

        return result.filter(r => !isNaN(r.count))
    }

    async status(): Promise<{fname: string; status: string}[]> {
        const gitResult = await this.execGit(['status', '--porcelain'], false)

        const result = gitResult.stdout
            .split('\n')
            .filter(l => l.trim().length >= 4) // XY<space>FNAME
            .map(l => {
                const status = l.slice(0, 2) // XY
                const fname = l.slice(3)
                return {
                    fname,
                    status
                }
            })

        return result
    }

    async diffNumStats(): Promise<
        {fname: string; added: number; deleted: number}[]
    > {
        const gitResult = await this.execGit(['diff', '--numstat'], false)

        const result = gitResult.stdout
            .split('\n')
            .filter(l => l.trim())
            .map(l => {
                const [added, deleted, fname] = l.split(/\s+/, 3)
                return {
                    added: parseInt(added),
                    deleted: parseInt(deleted),
                    fname
                }
            })

        return result.filter(e => !isNaN(e.added) && !isNaN(e.deleted))
    }

    isNew(porcelainStatus: string): boolean {
        return porcelainStatus === '??'
    }

    isDeleted(porcelainStatus: string): boolean {
        return porcelainStatus === ' D'
    }

    private async getEmptyTreeHashID(): Promise<string> {
        const result = await this.execGit(
            ['hash-object', '-t', 'tree', '/dev/null'],
            false
        )

        core.debug(`Empty Tree Hash ID: ${result.stdout}`)

        return result.stdout.trim()
    }

    private async execGit(
        args: string[],
        allowAllExitCodes = false,
        silent = false
    ): Promise<GitOutput> {
        const result = new GitOutput()

        const env: {[key: string]: string} = {}
        for (const key of Object.keys(process.env)) {
            const envValue = process.env[key]
            if (envValue === undefined) continue
            env[key] = envValue
        }
        for (const key of Object.keys(this.gitEnv)) {
            env[key] = this.gitEnv[key]
        }

        const stdout: string[] = []

        const options = {
            cwd: this.workingDirectory,
            env,
            silent,
            ignoreReturnCode: allowAllExitCodes,
            listeners: {
                stdout: (data: Buffer) => {
                    stdout.push(data.toString())
                }
            }
        }

        result.exitCode = await exec.exec(`"${this.gitPath}"`, args, options)
        result.stdout = stdout.join('')
        return result
    }

    private async initializeCommandManager(
        workingDirectory: string
    ): Promise<void> {
        this.workingDirectory = workingDirectory

        this.gitPath = await io.which('git', true)
    }
}

class GitOutput {
    stdout = ''
    exitCode = 0
}
