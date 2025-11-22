import React from 'react';
import { Modal, Button, Space, Typography, Divider } from 'antd';
import { PlayCircleOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function WelcomeBackModal({ visible, candidate, onResume, onStartOver }) {
  if (!candidate) return null;

  const questionsCompleted = candidate.currentQuestionIndex;
  const totalQuestions = candidate.questions?.length || 6;
  const questionsRemaining = totalQuestions - questionsCompleted;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Modal
      title={null}
      open={visible}
      closable={false}
      maskClosable={false}
      width={500}
      footer={[
        <Space key="actions" style={{ width: '100%', justifyContent: 'space-between' }} size="middle">
          <Button
            key="start-over"
            size="large"
            icon={<ReloadOutlined />}
            onClick={onStartOver}
            danger
          >
            Start Over
          </Button>
          <Button
            key="resume"
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={onResume}
          >
            Resume Interview
          </Button>
        </Space>
      ]}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={2}>Welcome Back, {candidate.name}! 👋</Title>

        <Paragraph type="secondary">
          You have an unfinished interview session.
        </Paragraph>

        <Divider />

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>Interview Progress</Text>
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 24, color: '#1890ff' }}>
                {questionsCompleted} / {totalQuestions}
              </Text>
              <Text style={{ display: 'block', marginTop: 4 }}>
                questions completed
              </Text>
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Space>
              <ClockCircleOutlined style={{ color: '#faad14' }} />
              <Text type="secondary">
                Last activity: {formatTimestamp(candidate.lastActiveAt)}
              </Text>
            </Space>
          </div>

          <div style={{
            background: '#f0f2f5',
            padding: 16,
            borderRadius: 8,
            marginTop: 16
          }}>
            <Text strong>{questionsRemaining} questions remaining</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
              Click below to continue where you left off.
            </Paragraph>
          </div>
        </Space>
      </div>
    </Modal>
  );
}
