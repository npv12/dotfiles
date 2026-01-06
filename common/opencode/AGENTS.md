# AGENTS.md

## Tools you have access to
Available Agents & Tools: The development environment integrates multiple specialized sub-agents and tools to assist in daily tasks: an Explore agent for codebase navigation, an Executor agent for running code/commands, and a plan agent. Additionally, research tools like google_search, webfetch, and context7 are available to gather information. The guidelines below describe how and when to use these modes and agents.

### Plan Mode (Planning & Research)

Start every complex task in Plan Mode by researching and devising a clear plan before coding or execution. Leverage the following research tools and strategies:

Thorough Research: Gather relevant information before writing code. Use the google_search tool for general web queries and webfetch to retrieve contents of specific webpages or documentation. For framework or library-specific questions, use Context7 (via the MCP integration) to get up-to-date, version-specific documentation
reddit.com
* Always resolve a library’s ID first and fetch only the minimal docs needed; then summarize the key points instead of pasting large text dumps
reddit.com
* Planning: Based on the research, outline a step-by-step solution or implementation plan. Break the task into smaller sub-tasks or steps if possible. Ensure the plan addresses the user’s requirements and any potential pitfalls identified during research.
* Review with User: If the task is complex or assumptions were made, consider summarizing the proposed plan to the user for approval. Clarify any ambiguities now to avoid going off-track (e.g. ask questions if requirements are unclear or if something seems risky). This follows the principle: “Ask for clarification when the request is ambiguous, destructive, or risky.”
reddit.com
* Finalize Plan: Once confident in the plan, signal the end of planning by invoking submit_plan. This will proceed to execution phases. Always ensure the plan is well-structured and justified by the research to minimize mid-execution surprises.

### Execution (Executor Agent)

Use the Executor sub-agent to run code, commands, or other execution steps, offloading the actual running of tasks. Guidelines for using the executor:

**When to Use&&: Whenever a step in your plan involves running code (scripts, tests, build commands, etc.) or performing an action in the system, delegate it to the executor. This agent will carry out the command and return the result, allowing you to focus on logic and planning.

**Clear Instructions**: The Executor is a literal-minded agent – it will not infer intent beyond what you explicitly specify. Always provide clear, exact commands and the necessary context. For example, instead of saying “run the usual build,” specify the exact script or command (npm run build, pytest -v, etc.). If multiple steps are needed, instruct them one at a time in sequence.

* It’s best to execute in small verified steps: run a command, check its output or exit code, then decide on the next step. This way, if something fails, you can catch it early. Always verify the executor’s output – e.g. if you ran tests, ensure all tests passed; if a build, confirm the build succeeded – before moving on.

**Error Handling**: If a command executed by the executor fails or produces an error, do not ignore it. Stop the execution sequence, analyze the error, and adjust the plan or commands. Summarize the root cause of the failure and propose a fix (following the smallest effective fix approach). Only continue to the next steps once the issue is resolved. This approach aligns with the rule: “Stop on failure; summarize root cause; propose smallest fix.”
reddit.com

**Explicit Confirmation**: After critical commands (deployments, database migrations, etc.), have the executor return outputs or logs for confirmation. This ensures transparency and that no unintended side-effects occurred. The executor won’t decide on its own if something is “good” or not – that’s up to you to assess from the results.

### Codebase Exploration (Explore Agent)

The Explore agent is your assistant for reading and navigating the codebase or file system:

**When to Use**: If you need to understand existing code, find where a function or variable is defined, read the contents of a file, or search the repository for references, invoke the Explore agent. This agent can open files and retrieve their contents, or perform searches within the project.

**Navigating Code**: Clearly specify what to explore. For example: “Open the file src/utils/helper.js and show its contents,” or “Find all occurrences of loginUser in the repository.” The Explore agent will return the relevant code or information. Use this to gather context (instead of guessing how something is implemented).

**Reading Output**: When the Explore agent provides file content or search results, review it carefully. Integrate important details into your solution. For instance, if the user asks for a change in a function, use Explore to fetch that function’s current implementation before modifying it. This ensures you base changes on actual code context.

**Stay Within Bounds**: Only use Explore to read non-sensitive, project-related files. It typically has read-only access and should not be used to alter files (that’s done through the execution process if needed). Also, avoid reading huge files in their entirety if not necessary – prefer to search for the specific parts needed (to keep the context focused and within limits).

Using the Explore agent effectively can save time and prevent mistakes by ensuring you have the relevant code context at hand for any development task.

## Agent Conduct & Best Practices

Follow these general guidelines to ensure productive and safe interactions across all agents:

1. Verify Assumptions: Before running code or making changes, double-check your assumptions. If something in the plan relies on a certain condition (a file existing, a version of a library, etc.), verify it via the Explore agent or by reading documentation. Proactively calling out uncertainties is encouraged

2. Seek Clarification When Needed: If a user’s request or an instruction is unclear, or if you suspect following it blindly could be harmful (e.g. dropping a database, exposing credentials), pause and ask for clarification. It’s better to confirm the intent than to do irreversible damage. No agent should proceed with a potentially harmful action without explicit user consent.

3. Summarize Intent for Complex Changes: When about to perform a complex or multi-step change, first explain your plan (in brief) to the user. For example, say “I will refactor module X by doing A, B, C.” This ensures the user is aware of the approach and can correct any misunderstanding before you execute.

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
* Always use context7 or google first (using webfetch) before asking me any questions. This is crucial when implementing using any library or framework.
* Always run lint/typecheck commands after making changes to ensure code is correct
* If you find a file has been modified and a feature is missing, ask me before implementing it again.

## Tool Usage Patterns
- **Avoid** using Bash for file operations (read, write, search) - use dedicated tools instead
- **Batch independent operations**: Run multiple tool calls in parallel when possible for optimal performance
- **Use Task tool** for complex multi-step tasks that require planning and exploration
