# td command inventory

## Source and date

- Local CLI introspection on February 17, 2026 using recursive `--help`
- Installed CLI version: `td 1.13.0`
- Official repository: https://github.com/Doist/todoist-cli
- Package listing: https://www.npmjs.com/package/@doist/todoist-cli

## Global options

- `-V`, `--version`
- `--no-spinner`
- `--progress-jsonl [path]`
- `-v`, `--verbose`
- `-h`, `--help`

## Top-level commands

- `add`
- `today`
- `upcoming`
- `inbox`
- `completed`
- `task`
- `project`
- `label`
- `comment`
- `section`
- `workspace`
- `activity`
- `reminder`
- `settings`
- `auth`
- `stats`
- `filter`
- `notification`
- `skill`
- `completion`
- `help [command]`

## Task command family

- `td task list`
- `td task view`
- `td task complete`
- `td task uncomplete`
- `td task delete`
- `td task add`
- `td task update`
- `td task move`
- `td task browse`

### Task creation flags

- `--due <date>`
- `--deadline <date>`
- `--priority <p1-p4>`
- `--project <name|id:xxx>`
- `--section <name|id:xxx>`
- `--labels <a,b>`
- `--parent <ref>`
- `--description <text>`
- `--assignee <ref>`
- `--duration <time>`

## Project command family

- `td project list`
- `td project view`
- `td project collaborators`
- `td project delete`
- `td project create`
- `td project update`
- `td project archive`
- `td project unarchive`
- `td project browse`

## Label command family

- `td label list`
- `td label create`
- `td label delete`
- `td label update`
- `td label browse`

## Comment command family

- `td comment list`
- `td comment add`
- `td comment delete`
- `td comment update`
- `td comment view`
- `td comment browse`

## Section command family

- `td section list`
- `td section create`
- `td section delete`
- `td section update`
- `td section browse`

## Workspace command family

- `td workspace list`
- `td workspace view`
- `td workspace projects`
- `td workspace users`

## Reminder command family

- `td reminder list`
- `td reminder add`
- `td reminder update`
- `td reminder delete`

## Settings command family

- `td settings view`
- `td settings update`
- `td settings themes`

## Auth command family

- `td auth login`
- `td auth token`
- `td auth status`
- `td auth logout`

## Stats command family

- `td stats goals`
- `td stats vacation`

## Filter command family

- `td filter list`
- `td filter create`
- `td filter delete`
- `td filter update`
- `td filter show`
- `td filter browse`

## Notification command family

- `td notification list`
- `td notification view`
- `td notification accept`
- `td notification reject`
- `td notification read`
- `td notification unread`

## Skill command family

- `td skill install`
- `td skill update`
- `td skill uninstall`
- `td skill list`

## Completion command family

- `td completion install`
- `td completion uninstall`

## Agent note from CLI help

The CLI help explicitly advises agents to prefer `td task add` over `td add` and to prefer JSON or NDJSON output when supported.
