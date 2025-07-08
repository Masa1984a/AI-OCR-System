import React, { useState, useEffect } from 'react';
import { Chip, CircularProgress } from '@mui/material';
import { workflowApi } from '../services/api';

interface ApprovalInstance {
  id: string;
  status: string;
  currentState?: {
    id: string;
    label: string;
    isFinal: boolean;
  };
  workflow: {
    id: string;
    name: string;
  };
}

interface ApprovalStatusBadgeProps {
  documentId: string;
}

const ApprovalStatusBadge: React.FC<ApprovalStatusBadgeProps> = ({ documentId }) => {
  const [approvalInstance, setApprovalInstance] = useState<ApprovalInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovalData();
  }, [documentId]);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      const response = await workflowApi.getApprovalInstance(documentId);
      setApprovalInstance(response.data);
    } catch (err: any) {
      console.error('Failed to load approval data:', err);
      // 承認フローが未開始の場合は404エラーが返される（正常）
      if (err.response?.status === 404) {
        setApprovalInstance(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'error';
      case 'pending':
      case 'active':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <CircularProgress size={20} />;
  }

  if (!approvalInstance) {
    return (
      <Chip
        label="承認フロー未開始"
        color="default"
        variant="outlined"
        size="small"
      />
    );
  }

  return (
    <Chip
      label={approvalInstance.currentState?.label || approvalInstance.status}
      color={getStatusColor(approvalInstance.status)}
      variant="filled"
      size="small"
    />
  );
};

export default ApprovalStatusBadge;