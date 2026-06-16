---
name: notion-research-documentation
description: Searches across your Notion workspace, synthesizes findings from multiple pages, and creates comprehensive research documentation saved as new Notion pages. Turns scattered information into structured reports with proper citations and actionable insights.
---

# Research & Documentation

Enables comprehensive research workflows: search for information across your Notion workspace, fetch and analyze relevant pages, synthesize findings, and create well-structured documentation.

## Quick Start

When asked to research and document a topic:

1. **Search for relevant content**: Use `Notion:notion-search` to find pages
2. **Fetch detailed information**: Use `Notion:notion-fetch` to read full page content
3. **Synthesize findings**: Analyze and combine information from multiple sources
4. **Create structured output**: Use `Notion:notion-create-pages` to write documentation

## Research Workflow

### Step 1: Search for relevant information

```
Use Notion:notion-search with the research topic
Filter by teamspace if scope is known
Review search results to identify most relevant pages
```

### Step 2: Fetch page content

```
Use Notion:notion-fetch for each relevant page URL
Collect content from all relevant sources
Note key findings, quotes, and data points
```

### Step 3: Synthesize findings

Analyze the collected information:

- Identify key themes and patterns
- Connect related concepts across sources
- Note gaps or conflicting information
- Organize findings logically

### Step 4: Create structured documentation

Use the appropriate documentation template to structure output:

- Clear title and executive summary
- Well-organized sections with headings
- Citations linking back to source pages
- Actionable conclusions or next steps

## Output Formats

Choose the appropriate format based on request:

**Research Summary**: Concise overview with key findings, methodology, and conclusions
**Comprehensive Report**: Full analysis with detailed sections, methodology, and appendices
**Quick Brief**: Fast 2-3 paragraph summary with key takeaways

## Best Practices

1. **Cast a wide net first**: Start with broad searches, then narrow down
2. **Cite sources**: Always link back to source pages using mentions
3. **Verify recency**: Check page last-edited dates for current information
4. **Cross-reference**: Validate findings across multiple sources
5. **Structure clearly**: Use headings, bullets, and formatting for readability

## Common Issues

**"No results found"**: Try broader search terms or different teamspaces
**"Too many results"**: Add filters or search within specific pages
**"Can't access page"**: User may lack permissions, ask them to verify access
