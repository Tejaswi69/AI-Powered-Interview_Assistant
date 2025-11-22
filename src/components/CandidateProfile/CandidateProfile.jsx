import React from 'react';
import { Card, Descriptions, Tag, Space } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, FileTextOutlined } from '@ant-design/icons';

export default function CandidateProfile({ candidate }) {
  if (!candidate) return null;

  return (
    <Card
      title={
        <Space>
          <UserOutlined />
          <span>Candidate Profile</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item
          label={<><UserOutlined /> Name</>}
        >
          {candidate.name || <Tag color="warning">Not provided</Tag>}
        </Descriptions.Item>

        <Descriptions.Item
          label={<><MailOutlined /> Email</>}
        >
          {candidate.email || <Tag color="warning">Not provided</Tag>}
        </Descriptions.Item>

        <Descriptions.Item
          label={<><PhoneOutlined /> Phone</>}
        >
          {candidate.phone || <Tag color="warning">Not provided</Tag>}
        </Descriptions.Item>

        {candidate.resumeMeta && (
          <Descriptions.Item
            label={<><FileTextOutlined /> Resume</>}
          >
            {candidate.resumeMeta.name}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}
