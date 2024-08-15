# slack-notification-github

## インフラ

```mermaid
graph LR
  GitHub
  GitHubApp[GitHub App]
  subgraph AWS
    Lambda
    DynamoDB
  end

  GitHub <--> GitHubApp <--> Lambda <--> DynamoDB
```
