import Title from "antd/es/typography/Title";
import Dragger from "antd/es/upload/Dragger";
import React, { useState, useEffect } from "react";
import { Button, Col, Row, Progress } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import AWS from "aws-sdk";
import "antd/dist/antd.css";

const bucketName = process.env.REACT_APP_AWS_BUCKET_NAME;
const awsRegion = process.env.REACT_APP_AWS_REGION;
const identityPoolId = process.env.REACT_APP_AWS_IDENTITY_POOL_ID;

console.log(bucketName, awsRegion, identityPoolId);

function generateUUID() {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
};

const credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: identityPoolId
});

AWS.config.update({
  region: awsRegion,
  credentials
});

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: {
    Bucket: bucketName
  }
});

const uploadFile = (fileName, file, onProgress) => {
  const request = s3.upload({
    Bucket: bucketName,
    Body: file,
    Key: fileName,
    ACL: "private"
  });
  onProgress && request.on("httpUploadProgress", onProgress);
  return request.promise();
};

const listAllFiles = () => {
  const request = s3.listObjects({
    Bucket: bucketName
  });
  return request.promise();
};

const deleteFile = fileKey => {
  const request = s3.deleteObject({
    Bucket: bucketName,
    Key: fileKey
  });
  return request.promise();
};

function App() {
  const [file, setFile] = useState();
  const [progress, setProgress] = useState(0);
  const [fileList, setFileList] = useState([]);
  const onFileChange = data => {
    setFile(data.file);
  };
  const handleFileUpload = async () => {
    try {
      uploadFile(file.name, file, ({ loaded, total }) => {
        if (total) {
          const percent = (+loaded * 100) / +total;
          setProgress(Math.floor(percent));
        }
      });
      console.log("res --->");
    } catch (e) {
      console.log("error --->", e);
    }
  };
  useEffect(() => {
    (async function getFileList() {
      const list = await listAllFiles();
      list.Contents.forEach(obj => {
        const url = s3.getSignedUrl("getObject", {
          Bucket: list.Name,
          Key: obj.Key,
          Expires: 600
        });
        obj.href = url;
      });
      setFileList(list.Contents);
      list && console.log("list", list);
    })();
  }, []);
  return (
    <div className="App">
      <Row>
        <Col>
          <Row style={{ margin: "30px" }}>
            <Col>
              <Title>Upload the file</Title>
            </Col>
          </Row>
          <Row style={{ margin: "30px" }}>
            <Col>
              <Dragger
                listType="card"
                onChange={onFileChange}
                beforeUpload={() => false}
                multiple={false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Click or drag file to this area to upload
                </p>
                <p className="ant-upload-hint">
                  Support for a single or bulk upload. Strictly prohibit from
                  uploading company data or other band files
                </p>
              </Dragger>
            </Col>
          </Row>
          <Row style={{ margin: "30px" }}>
            <Col>
              <Progress
                type="circle"
                strokeColor={{
                  "0%": "#108ee9",
                  "100%": "#87d068"
                }}
                percent={progress}
              />
            </Col>
          </Row>
          <Row style={{ margin: "30px" }}>
            <Button disabled={!file} onClick={handleFileUpload}>
              Upload
            </Button>
          </Row>
          <Row>
            <Col>{JSON.stringify(fileList)}</Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}

export default App;
