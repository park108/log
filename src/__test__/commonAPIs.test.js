import * as commonLog from '../Log/commonLog';
import * as commonFile from '../File/commonFile';
import * as commonImage from '../Image/commonImage';

describe('get API URL by stage', () => {
  
  it("Log app. test stage API URL", () => {
    process.env.NODE_ENV = "development";
    const apiUrl = commonLog.getAPI();
    expect(apiUrl).toBe("https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/test");
  });
  
  it("Log app. prod stage PI URL", () => {
    process.env.NODE_ENV = "production";
    const apiUrl = commonLog.getAPI();
    expect(apiUrl).toBe("https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/prod");
  });
  
  it("File app. test stage API URL", () => {
    process.env.NODE_ENV = "development";
    const apiUrl = commonFile.getAPI();
    expect(apiUrl).toBe("https://urruauaj81.execute-api.ap-northeast-2.amazonaws.com/test");
  });
  
  it("File app. prod stage API URL", () => {
    process.env.NODE_ENV = "production";
    const apiUrl = commonFile.getAPI();
    expect(apiUrl).toBe("https://urruauaj81.execute-api.ap-northeast-2.amazonaws.com/prod");
  });
  
  it("Image app. test stage API URL", () => {
    process.env.NODE_ENV = "development";
    const apiUrl = commonImage.getAPI();
    expect(apiUrl).toBe("https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com/test");
  });
  
  it("Image app. prod stage PI URL", () => {
    process.env.NODE_ENV = "production";
    const apiUrl = commonImage.getAPI();
    expect(apiUrl).toBe("https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com/prod");
  });
});