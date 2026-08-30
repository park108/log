# log
This project started to write a personal journal.

## Local setup
Copy `.env.example` to `.env.development.local` and `.env.production.local`, then fill in the API Gateway domains and Cognito Hosted UI URLs. These files are gitignored. On AWS Amplify, set the same variables under **App settings > Environment variables**.

```
VITE_LOG_API_BASE
VITE_SEARCH_API_BASE
VITE_MONITOR_API_BASE
VITE_IMAGE_API_BASE
VITE_FILE_API_BASE
VITE_COMMENT_API_BASE
VITE_COGNITO_LOGIN_URL_PROD
VITE_COGNITO_LOGIN_URL_DEV
VITE_COGNITO_LOGOUT_URL_PROD
VITE_COGNITO_LOGOUT_URL_DEV
```

## Measuring layout

jsdom does not lay out, so questions like "where does this popup land",
"does this overflow on mobile", or "do these two controls sit on the same
line" cannot be answered by the test suite. `scripts/measure-layout.mjs`
drives the Chrome already installed on the machine over CDP and reports the
real geometry. It adds no dependency and is **not** part of CI — it is the
tool you reach for when deciding a layout contract, not when guarding one.

```
node scripts/measure-layout.mjs <file-or-url> --width 375,900 --overflow
node scripts/measure-layout.mjs <file-or-url> --select '.a,.b'
```

It reports the glyph position alongside the box: a `<button>` and a `<span>`
can have different box heights while their text sits on exactly the same
line, and only the glyph tells you which one a reader would notice.

## On AWS with Serverless Architecture
This application is running on AWS.
It is being used as a sandbox for various serverless architectures.

### File processing using SNS and SQS
Related article: https://www.park108.net/log/1638259886256
![S3 metadata management with serverless architecture](https://park108-image-prod.s3.ap-northeast-2.amazonaws.com/20211130-91339b77-5b21-4d38-8acb-a338296cee20.png "S3 metadata management with serverless architecture")   

### CQRS pattern for serverless architecture using DynamoDB Streams
Related article: https://www.park108.net/log/1654526816493
![CQRS pattern for serverless architecture](https://park108-image-prod.s3.ap-northeast-2.amazonaws.com/20220606-e1ace1d1-6428-4337-a175-6ed980d4189f.png "CQRS pattern for serverless architecture")   

### Customized build notification using SNS and Slack Incoming Webhook
Related article: https://www.park108.net/log/1656597254637
![Serverless search archtecture using Athena](https://park108-image-prod.s3.ap-northeast-2.amazonaws.com/20220630-30875df0-7ab2-4cc3-a9bd-5baebd86e072.png "Serverless search archtecture using Athena")   

### Low cost serverless search archtecture using Athena
Related article: https://www.park108.net/log/1658307816923
![Serverless search archtecture using Athena](https://park108-image-prod.s3.ap-northeast-2.amazonaws.com/20220720-8119726a-1c61-4af1-a2b5-5cb7a30c558e.png "Serverless search archtecture using Athena")   

### Serverless search architecture for API call logs
Related article: https://www.park108.net/log/1661931424720
![Serverless search archtecture for API call logs](https://park108-log-prod.s3.ap-northeast-2.amazonaws.com/20220831_Serverless_search_architecture_for_API_call_logs.png "Serverless search archtecture for API call logs")   