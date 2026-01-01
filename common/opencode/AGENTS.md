# AGENTS.md

## Language & Style
- **Language:** English only - all code, comments, docs, examples, commits, configs, errors, tests
- **Inclusive Terms:** allowlist/blocklist, primary/replica, placeholder/example, main branch, conflict-free, concurrent/parallel
- **Style**: Prefer self-documenting code over comments

## Modern Tools
Use these modern tools for better performance and features:

### Search & Find
- **Always use `rg` (ripgrep)** instead of `grep`:
  ```bash
  # ❌ Don't use grep
  grep -r "pattern" .

  # ✅ Use rg instead
  rg "pattern"
  ```

- **Always use `fd`** instead of `find`:
  ```bash
  # ❌ Don't use find
  find . -name "*.js"

  # ✅ Use fd instead
  fd -e js
  # or
  fd --files -g "*.js"
  ```

- **Always use Glob** instead of find for file pattern matching

 ### Information Gathering
 - **Use `webfetch` tool** for Google searches and real-time information:
   ```bash
   # Example: Before implementing a feature or asking about a library, google it first
   # ❌ Don't ask user directly
   # "How do I use Next.js app router?"

   # ✅ Use webfetch with Google search URL
   webfetch(url: "https://www.google.com/search?q=Next.js+app+router+best+practices+2025")
   ```
 - **Use `context7` for latest framework/library documentation** when unsure about any library or need up-to-date docs
 - Always prefer using latest versions of any library or framework unless I explicitly mention to use a specific version

## Git Guidelines
- Never commit or stage anything into git
- May use read-only commands like `git diff`, `git status`, `git log`

## Development Preferences
- **Always prefer using TypeScript over JavaScript** unless I explicitly mention to use JavaScript
- **Always prefer using functional components and hooks over class components** unless I explicitly mention to use class
- **Tools over scripts**: Prefer using dedicated tools for tasks (e.g., `rg`, `fd`, `prettier`, `eslint`) instead of writing custom scripts
- **Package Managers**: We use mise over standard packages. However mise is sometimes not loaded by default. If this is your first command, then please enable mise using eval "$(mise activate zsh)" and then run your command. This is useful when certain command says "command not found"

## Notes
* Unless I explicitly mention to implement something, do not update code. If unsure, ask me first. Always print a summary.
* If you find any information, always use notion MCP server to connect to notion and document everything. Document it in simbian teamspace. Create tasks in task tracker
* Always use context7 or google first (using webfetch) before asking me any questions. This is crucial when implementing using any library or framework.
* Always run lint/typecheck commands after making changes to ensure code is correct
* If you find a file has been modified and a feature is missing, ask me before implementing it again.

## Tool Usage Patterns
- **Avoid** using Bash for file operations (read, write, search) - use dedicated tools instead
- **Batch independent operations**: Run multiple tool calls in parallel when possible for optimal performance
- **Use Task tool** for complex multi-step tasks that require planning and exploration
