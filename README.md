# log
This project was started to write a personal journal.  
And it is used as a sandbox.

## On AWS with Serverless Architecture
This application runs on AWS.  
It uses serverless architecture for performance and cost efficiency.

### Cognito
Uses an Cognito user pool to identify administrators.

### Amplify with React
The frontend was build with React and it used Amplify for CI/CD to connect the github repository.

### API Gateway
Connect the backend and frontend using API Gateway.  
Test and Prod are divided by operating multiple stages.

### Lambda
Each REST API runs a Lambda function.  
This project uses Lambda for high availability and cost efficiency.

### DynamoDB
DynamoDB is a NoSQL DB that sutable for serverless architecture.  
According to the MSA philosophy, it uses only one table.

### S3
HTML file uploader for personal purpose.  
When a file dragged into the drop zone, API Gateway w/ Lambda gets the S3 pre-signed URL.  
Upload multiple files directly into S3 bucket using pre-signed URLs.  

### Simple Notification Service(SNS)
S3 object create events publish topic to make resized image.  
Lambda function subscribe the topic, then resize image file for web hosting.