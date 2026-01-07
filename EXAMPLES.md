# Example Usage Scenarios

## Scenario 1: Deployment Workflow

```
Agent is deploying an application and needs user confirmation at critical steps:

speak({
  message: "About to deploy version 2.3.1 to production. Continue?",
  message_type: "question"
})

[User responds: yes]

speak({
  message: "Starting deployment. This will take approximately 5 minutes.",
  message_type: "update"
})

[Deployment happens...]

speak({
  message: "Deployment complete! All health checks passed.",
  message_type: "update"
})
```

## Scenario 2: Database Migration

```
Agent needs to perform a potentially destructive operation:

speak({
  message: "Found 847 orphaned records. Should I clean these up?",
  message_type: "question"
})

[User responds: yes]

speak({
  message: "Deleting orphaned records... 25% complete",
  message_type: "update"
})

speak({
  message: "Cleanup complete. Removed 847 records, freed 2.3GB of space.",
  message_type: "info"
})
```

## Scenario 3: Configuration Issues

```
Agent discovers problems during analysis:

speak({
  message: "Found 3 critical security issues in the configuration. Would you like details?",
  message_type: "warning"
})

[User responds: yes]

speak({
  message: "Issue 1: SSL certificate expires in 7 days. Issue 2: Database password is using default value. Issue 3: Debug mode is enabled in production.",
  message_type: "info"
})

speak({
  message: "Should I create tickets for these issues?",
  message_type: "question"
})
```

## Scenario 4: Long Running Task

```
Agent is processing a large dataset:

speak({
  message: "Processing 10,000 customer records. This may take a while.",
  message_type: "update"
})

[Time passes...]

speak({
  message: "Halfway done. Processed 5,000 records so far.",
  message_type: "update"
})

[More time passes...]

speak({
  message: "Processing complete! 9,856 successful, 144 skipped due to validation errors.",
  message_type: "info"
})
```

## Best Practices

1. **Be specific**: "Deploy version 2.3.1?" is better than "Deploy?"
2. **Provide context**: "3 critical security issues found" is better than "Found issues"
3. **Show progress**: For long operations, give periodic updates
4. **Request permission**: Before destructive operations, always ask
5. **Confirm completion**: Let users know when important tasks finish
6. **Include relevant data**: Numbers, percentages, time estimates help users make decisions
