import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Card,
  Modal,
  Typography,
  Divider,
  Empty,
  Tooltip,
  message
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  TrophyOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { deleteCandidate } from '../../store/candidatesSlice';

const { Search } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

export default function InterviewerDashboard() {
  const dispatch = useDispatch();
  const candidates = useSelector(state => state.candidates);

  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score'); // score, date, name
  const [filterStatus, setFilterStatus] = useState('all'); // all, completed, in_progress
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Convert candidates object to array
  const candidatesList = useMemo(() => {
    return candidates.allIds.map(id => candidates.byId[id]);
  }, [candidates]);

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    let filtered = candidatesList;

    // Search filter
    if (searchText) {
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.finalScore ?? -1;
        const scoreB = b.finalScore ?? -1;
        return scoreB - scoreA; // Descending
      } else if (sortBy === 'date') {
        return (b.createdAt || 0) - (a.createdAt || 0); // Most recent first
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return filtered;
  }, [candidatesList, searchText, sortBy, filterStatus]);

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailModal(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Candidate',
      content: 'Are you sure you want to delete this candidate? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        console.log('Deleting candidate with ID:', id);

        // Close detail modal if the deleted candidate is currently viewed
        if (selectedCandidate?.id === id) {
          setShowDetailModal(false);
          setSelectedCandidate(null);
        }

        dispatch(deleteCandidate(id));
        message.success('Candidate deleted successfully');
      }
    });
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      completed: { color: 'success', text: 'Completed' },
      in_progress: { color: 'processing', text: 'In Progress' },
      paused: { color: 'warning', text: 'Paused' },
      collecting_info: { color: 'default', text: 'Collecting Info' }
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 70) return '#52c41a';
    if (percentage >= 50) return '#faad14';
    return '#f5222d';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 70,
      render: (_, __, index) => (
        <Space>
          {index < 3 && <TrophyOutlined style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][index] }} />}
          <Text strong>#{index + 1}</Text>
        </Space>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Text strong>{name || 'N/A'}</Text>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <Text type="secondary">{email || 'N/A'}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Score',
      key: 'score',
      render: (_, record) => {
        if (record.finalScore === null) return <Text type="secondary">Not completed</Text>;
        const maxScore = (record.questions?.length || 6) * 10;
        const percentage = ((record.finalScore / maxScore) * 100).toFixed(0);
        return (
          <Space>
            <Text strong style={{ color: getScoreColor(record.finalScore, maxScore) }}>
              {record.finalScore}/{maxScore}
            </Text>
            <Tag color={getScoreColor(record.finalScore, maxScore)}>
              {percentage}%
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (timestamp) => (
        <Tooltip title={formatDate(timestamp)}>
          <Text type="secondary">{formatDate(timestamp)}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              size="small"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="shadow-lg">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Title level={2}>Interviewer Dashboard</Title>
            <Text type="secondary">
              View and manage all candidate interviews
            </Text>
          </div>

          {/* Filters */}
          <Space size="middle" wrap>
            <Search
              placeholder="Search by name or email"
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 150 }}
            >
              <Option value="score">Sort by Score</Option>
              <Option value="date">Sort by Date</Option>
              <Option value="name">Sort by Name</Option>
            </Select>

            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
            >
              <Option value="all">All Status</Option>
              <Option value="completed">Completed</Option>
              <Option value="in_progress">In Progress</Option>
            </Select>

            <Text type="secondary">
              Total: {filteredCandidates.length} candidate(s)
            </Text>
          </Space>

          {/* Table */}
          {filteredCandidates.length === 0 ? (
            <Empty description="No candidates found" />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredCandidates}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          )}
        </Space>
      </Card>

      {/* Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCandidate(null);
        }}
      />
    </div>
  );
}

// Candidate Detail Modal Component
function CandidateDetailModal({ candidate, visible, onClose }) {
  if (!candidate) return null;

  const maxScore = (candidate.questions?.length || 6) * 10;
  const percentage = candidate.finalScore
    ? ((candidate.finalScore / maxScore) * 100).toFixed(1)
    : 0;

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  return (
    <Modal
      title="Candidate Details"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Profile */}
        <Card size="small">
          <Space direction="vertical">
            <Title level={4}>{candidate.name}</Title>
            <Text><strong>Email:</strong> {candidate.email}</Text>
            <Text><strong>Phone:</strong> {candidate.phone}</Text>
            <Text><strong>Status:</strong> {candidate.status}</Text>
            {candidate.resumeMeta && (
              <Text type="secondary">
                <strong>Resume:</strong> {candidate.resumeMeta.name}
              </Text>
            )}
          </Space>
        </Card>

        {/* Score Summary */}
        {candidate.finalScore !== null && (
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>
                Final Score: {candidate.finalScore}/{maxScore} ({percentage}%)
              </Title>
              {candidate.finalSummary?.summary && (
                <Paragraph>{candidate.finalSummary.summary}</Paragraph>
              )}
            </Space>
          </Card>
        )}

        {/* Questions & Answers */}
        <div>
          <Title level={5}>Questions & Answers</Title>
          <Divider style={{ margin: '12px 0' }} />

          {candidate.questions?.length > 0 ? (
            candidate.questions.map((q, index) => (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <Text strong>Q{index + 1}</Text>
                    <Tag color={getDifficultyColor(q.difficulty)}>
                      {q.difficulty.toUpperCase()}
                    </Tag>
                    {q.timeLimit && (
                      <Tag icon={<ClockCircleOutlined />}>{q.timeLimit}s</Tag>
                    )}
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Question:</Text>
                    <Paragraph>{q.question}</Paragraph>
                  </div>

                  <div>
                    <Text strong>Answer:</Text>
                    <Paragraph>
                      {q.answer || <Text type="secondary">(No answer provided)</Text>}
                    </Paragraph>
                    {q.timeSpent && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Time taken: {q.timeSpent}s
                      </Text>
                    )}
                  </div>

                  {q.score !== null && (
                    <div>
                      <Space>
                        <Text strong>Score:</Text>
                        <Tag color={q.score >= 7 ? 'green' : q.score >= 5 ? 'orange' : 'red'}>
                          {q.score}/10
                        </Tag>
                      </Space>
                      {q.feedback && (
                        <Paragraph style={{ marginTop: 8 }}>{q.feedback}</Paragraph>
                      )}
                    </div>
                  )}
                </Space>
              </Card>
            ))
          ) : (
            <Empty description="No questions available" />
          )}
        </div>

        {/* Chat History */}
        {candidate.chatHistory?.length > 0 && (
          <div>
            <Title level={5}>Full Chat History</Title>
            <Divider style={{ margin: '12px 0' }} />
            <Card size="small" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {candidate.chatHistory.map((msg, index) => (
                <div key={index} style={{ marginBottom: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <Tag>{msg.type}</Tag>
                  <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                    {msg.content}
                  </Paragraph>
                </div>
              ))}
            </Card>
          </div>
        )}
      </Space>
    </Modal>
  );
}
