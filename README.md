# mm-check-changes

This action analyzes the changes of indicator lists before the commit to detect "big changes".
This action can be used in an indicator lists processing workflow to detect risky changes and request manual approval to avoid disruption on your infrastructure.

The action can be used to:
- detect big changes in indicator lists and open a PR for manual approval instead of automatically pushing the changes

## Inputs

### `path`

Relative path under $GITHUB_WORKSPACE to find the repository.

Default: *.*

### `includeGlob`

if specified, only the files matching this glob pattern are used to calculate the change size. This glob pattern is checked before `excludeGlob`.

Default: *none*

### `excludeGlob`

If specified, files matching this glob pattern are excluded from analysis. This glob pattern is checked after `includeGlob`.

Default: *none*

### `thrNewFiles`

Threshold for the number of new files in working directory. If the number of new files in working directory is greater than or equal to `thrNewFiles`, the action sets the `bigChange` output to `true`. Set to `0` to disable.

Default: *1*

### `thrRemovedFiles`

Threshold for the number of deleted files in working directory. If the number of files deleted in working directory is greater than or equal to `thrRemovedFiles`, the action sets the `bigChange` output to `true`. Set to `0` to disable.

Default: *1*

### `thrRelChanges`

Threshold for the number of relative changes in a list (in %). If the ratio between changed lines (sum of added and deleted lines) and number of lines in the current version of the file is greater than or equal to `thrRelChanges`, the action sets the `bigChange` flag to `true`. Set to `0` to disable.

Default: *100*

### `thrAbsChanges`

Threshold for the number of absolute changes in a list. If the number of changed lines (sum of added and deleted lines) is greater than or equal to `thrAbsChanges`, the action sets the `bigChange` output to `true`. Set to `0` to disable.

Default: *0*

## Outputs

### `newFiles`

Number of new files detected.

### `removedFiles`

Number of deleted files detected.

### `maxAbsChanges`

Maximum number of absolute changes detected.

### `maxRelChanges`

Maximum number of relative changes detected.

### `bigChange`

`true` if the change is a "big change", `false` otherwise.

## Example usage

### Open a PR if big changes
```yaml
# Standard use case: mm-check-changes is used to detect big changes
# in the repo. If big changes are detected, the create-pull-request action
# is triggered to open a PR instead of pushing changes directly into the repo
#
- name: Check changes
  id: check_changes
  uses: jtschichold/mm-check-changes@fef08ed6dd
  with:
    includeGlob: feeds/**/*.txt
- name: Create PR
  if: steps.check_changes.outputs.bigChange == 'true'
  uses: peter-evans/create-pull-request@45c510e
  with:
    branch: please-check-changes
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
