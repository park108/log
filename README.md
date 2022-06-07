# log
This project started to write a personal journal.  
It is using as a sandbox for serverless pattern.

## On AWS with Serverless Architecture
This application runs on AWS.  
It uses serverless architecture for performance and cost efficiency.

### Cognito
Uses an Cognito user pool to identify administrators.

### Amplify with React
The frontend was built with React.   
it used Amplify for CI/CD to connect the github repository.

### API Gateway
Connect the backend and frontend using API Gateway.  
It operates in multiple stages.

### Lambda
Each REST API runs a Lambda function.  
This project uses Lambda for high availability and cost efficiency.

### DynamoDB
DynamoDB is a NoSQL DB that suitable for serverless architecture.  
According to the MSA philosophy, it uses only one table for each app.

### S3
When a file dragged into the drop zone in frontend, API Gateway w/ Lambda gets the S3 pre-signed URL.  
Upload multiple files directly into S3 bucket using pre-signed URLs.  

### File processing using SNS and SQS
![S3 metadata management with serverless architecture](https://park108-image-prod.s3.ap-northeast-2.amazonaws.com/20211130-91339b77-5b21-4d38-8acb-a338296cee20.png "S3 metadata management with serverless architecture")

### CQRS pattern for serverless architecture using DynamoDB Streams
![CQRS pattern for serverless architecture](https://park108-image-prod.s3.ap-northeast-2.amazonaws.com/20220606-e1ace1d1-6428-4337-a175-6ed980d4189f.png "CQRS pattern for serverless architecture")