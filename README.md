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

Threshold for the number of new files in working directory. If the number of new files in working directory is greater than or equal to `thrNewFiles`, the action sets the `bigChange` output to `true`.

Default: *1*

### `thrRemovedFiles`

Threshold for the number of deleted files in working directory. If the number of files deleted in working directory is greater than or equal to `thrRemovedFiles`, the action sets the `bigChange` output to `true`.

Default: *1*

### `thrRelChanges`

Threshold for the number of relative changes in a list (in %). If the ratio between changed lines (sum of added and deleted lines) and number of lines in the current version of the file is greater than or equal to `thrRelChanges`, the action sets the `bigChange` flag to `true`.

Default: *100*

### `thrAbsChanges`

Threshold for the number of absolute changes in a list. If the number of changed lines (sum of added and deleted lines) is greater than or equal to `thrAbsChanges`, the action sets the `bigChange` output to `true`.

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

### Aggregate & Collapse
```yaml
# Basic usage, all the networks from the files matching *.list pattern
# are aggregated and collapsed.
# 
# Example:
# List (from *.list): 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
# Result: 10.0.0.0/23, 10.0.2.0/24
uses: jtschichold/mm-process-ip-list
with:
  list: *.list
```

### Aggregate & Collapse & Filter
```yaml
# All the networks from the files matching *.list pattern are aggregated,
# collapsed and the subnets overlapping one of the entries in 
# myorgips.filter are dropped (and saved in delta)
#
# Example: 
# List (from *.list): 10.0.0.0, 10.0.0.1, 10.0.1.0/24
# Filter (from myorgs.filter): 10.0.1.128/25
# Result: 10.0.0.0/31, 10.0.1.0/25
uses: jtschichold/mm-process-ip-list
with:
  list: *.list
  filter: myorgips.filter
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
