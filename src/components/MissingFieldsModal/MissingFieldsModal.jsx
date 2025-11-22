import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function MissingFieldsModal({ visible, missingFields, onComplete, candidateName }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      onComplete(values);
      form.resetFields();
    } catch (error) {
      console.error('Form validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMissingFieldsList = () => {
    const fields = [];
    if (missingFields.name) fields.push('Name');
    if (missingFields.email) fields.push('Email');
    if (missingFields.phone) fields.push('Phone');
    return fields.join(', ');
  };

  return (
    <Modal
      title="Complete Your Profile"
      open={visible}
      closable={false}
      maskClosable={false}
      footer={[
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Continue to Interview
        </Button>
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Text>
          We couldn't extract all required information from your resume.
          Please provide the missing details to continue.
        </Text>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Missing: {getMissingFieldsList()}
      </Text>

      <Form form={form} layout="vertical">
        {missingFields.name && (
          <Form.Item
            name="name"
            label="Full Name"
            rules={[
              { required: true, message: 'Please enter your full name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="John Doe"
              size="large"
            />
          </Form.Item>
        )}

        {missingFields.email && (
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="john.doe@example.com"
              size="large"
            />
          </Form.Item>
        )}

        {missingFields.phone && (
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Please enter your phone number' },
              {
                pattern: /^[\d\s\-\+\(\)]{10,}$/,
                message: 'Please enter a valid phone number'
              }
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="+1 234 567 8900"
              size="large"
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
