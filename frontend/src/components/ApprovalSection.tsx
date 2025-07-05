import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
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
  startedAt: string;
  completedAt?: string;
  dueAt?: string;
  metadata: any;
}

interface ApprovalStep {
  id: string;
  status: string;
  assignedTo?: {
    id: string;
    username: string;
  };
  delegatedTo?: {
    id: string;
    username: string;
  };
  actionTaken?: string;
  comment?: string;
  assignedAt: string;
  completedAt?: string;
  state: {
    id: string;
    label: string;
    actions?: StateAction[];
  };
}

interface StateAction {
  id: string;
  actionKey: string;
  actionLabel: string;
  requiresRole?: string;
  isDefault: boolean;
  displayOrder: number;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
}

interface ApprovalSectionProps {
  documentId: string;
}

const ApprovalSection: React.FC<ApprovalSectionProps> = ({ documentId }) => {
  const [approvalInstance, setApprovalInstance] = useState<ApprovalInstance | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalStep[]>([]);
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([]);
  const [currentStateActions, setCurrentStateActions] = useState<StateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // アクション実行用の状態
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StateAction | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // 承認開始用の状態
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  useEffect(() => {
    loadApprovalData();
    loadWorkflowDefinitions();
  }, [documentId]);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      const [instanceResponse, historyResponse] = await Promise.all([
        workflowApi.getApprovalInstance(documentId),
        workflowApi.getApprovalHistory(documentId),
      ]);
      
      const instance = instanceResponse.data;
      setApprovalInstance(instance);
      setApprovalHistory(historyResponse.data);

      // 現在の状態で利用可能なアクションを取得
      if (instance && instance.currentState?.id) {
        try {
          const actionsResponse = await workflowApi.getStateActions(instance.currentState.id);
          setCurrentStateActions(actionsResponse.data || []);
        } catch (actionsErr) {
          console.error('Failed to load state actions:', actionsErr);
          // アクション取得失敗時はデフォルトアクションを設定
          setCurrentStateActions([
            {
              id: 'approve',
              actionKey: 'approve',
              actionLabel: '承認',
              isDefault: true,
              displayOrder: 1,
            },
            {
              id: 'reject',
              actionKey: 'reject',
              actionLabel: '却下',
              isDefault: false,
              displayOrder: 2,
            },
          ]);
        }
      } else {
        setCurrentStateActions([]);
      }
    } catch (err: any) {
      console.error('Failed to load approval data:', err);
      if (err.response?.status !== 404) {
        setError('承認情報の読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowDefinitions = async () => {
    try {
      const response = await workflowApi.getDefinitions();
      setWorkflowDefinitions(response.data);
    } catch (err) {
      console.error('Failed to load workflow definitions:', err);
    }
  };

  const handleStartApproval = async () => {
    if (!selectedWorkflow) return;
    
    try {
      setActionLoading(true);
      const requestData = {
        documentId,
        workflowId: selectedWorkflow,
      };
      console.log('Starting approval with data:', requestData);
      
      await workflowApi.startApproval(requestData);
      
      setStartDialogOpen(false);
      setSelectedWorkflow('');
      await loadApprovalData();
    } catch (err: any) {
      console.error('Failed to start approval:', err);
      console.error('Error details:', err.response?.data);
      
      // エラーレスポンスの詳細を表示
      let errorMessage = '承認フローの開始に失敗しました';
      
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          // バリデーションエラーの場合、配列の最初のメッセージを表示
          errorMessage = err.response.data.message[0];
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      const errorDetails = err.response?.data?.details || '';
      setError(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionClick = (action: StateAction) => {
    setSelectedAction(action);
    setActionComment('');
    setActionDialogOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedAction) return;
    
    try {
      setActionLoading(true);
      await workflowApi.executeTransition({
        documentId,
        actionKey: selectedAction.actionKey,
        comment: actionComment,
      });
      
      setActionDialogOpen(false);
      setSelectedAction(null);
      setActionComment('');
      await loadApprovalData();
    } catch (err: any) {
      console.error('Failed to execute action:', err);
      setError('アクションの実行に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      default:
        return <PersonIcon color="default" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'approved':
      case 'completed':
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
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              承認状況を読み込み中...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          承認状況
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!approvalInstance ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              このドキュメントは承認フローが開始されていません
            </Typography>
            {workflowDefinitions.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setStartDialogOpen(true)}
                size="small"
              >
                承認フローを開始
              </Button>
            )}
          </Box>
        ) : (
          <Box>
            {/* 現在のステータス */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip
                label={approvalInstance.currentState?.label || approvalInstance.status}
                color={getStatusColor(approvalInstance.status)}
                variant="filled"
              />
              <Typography variant="body2" color="text.secondary">
                {approvalInstance.workflow.name}
              </Typography>
            </Box>

            {/* 利用可能なアクション */}
            {approvalInstance.status === 'active' && approvalInstance.currentState && currentStateActions.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  アクション
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {currentStateActions
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((action) => {
                      const getActionColor = (actionKey: string) => {
                        switch (actionKey) {
                          case 'approve':
                            return 'success';
                          case 'reject':
                            return 'error';
                          case 'delegate':
                            return 'warning';
                          case 'request_changes':
                            return 'info';
                          default:
                            return 'primary';
                        }
                      };

                      const getActionVariant = (isDefault: boolean) => {
                        return isDefault ? 'contained' : 'outlined';
                      };

                      return (
                        <Button
                          key={action.id}
                          variant={getActionVariant(action.isDefault)}
                          color={getActionColor(action.actionKey)}
                          size="small"
                          onClick={() => handleActionClick(action)}
                        >
                          {action.actionLabel}
                        </Button>
                      );
                    })
                  }
                </Box>
              </Box>
            )}

            {/* 承認履歴 */}
            {approvalHistory.length > 0 && (
              <Accordion defaultExpanded={approvalHistory.length <= 3}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    承認履歴 ({approvalHistory.length}件)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Timeline>
                    {approvalHistory.map((step, index) => {
                      const isOverdue = step.dueAt && !step.completedAt && new Date() > new Date(step.dueAt);
                      const isPending = step.status === 'pending';
                      const duration = step.completedAt 
                        ? Math.round((new Date(step.completedAt).getTime() - new Date(step.assignedAt).getTime()) / (1000 * 60 * 60))
                        : null;

                      return (
                        <TimelineItem key={step.id}>
                          <TimelineSeparator>
                            <TimelineDot 
                              color={
                                step.status === 'approved' ? 'success' :
                                step.status === 'rejected' ? 'error' :
                                isOverdue ? 'error' :
                                isPending ? 'warning' : 'primary'
                              }
                            >
                              {getStatusIcon(step.status)}
                            </TimelineDot>
                            {index < approvalHistory.length - 1 && <TimelineConnector />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Box sx={{ pb: 2 }}>
                              {/* ステップ名とステータス */}
                              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                <Typography variant="body2" fontWeight="bold">
                                  {step.state.label}
                                </Typography>
                                <Chip
                                  label={
                                    step.status === 'approved' ? '承認済み' :
                                    step.status === 'rejected' ? '却下' :
                                    step.status === 'delegated' ? '代理依頼' :
                                    isOverdue ? '期限切れ' :
                                    isPending ? '承認待ち' : step.status
                                  }
                                  size="small"
                                  color={getStatusColor(step.status)}
                                  variant="outlined"
                                />
                              </Box>

                              {/* 担当者情報 */}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                担当者: {step.assignedTo?.username || '未割当'}
                                {step.delegatedTo && (
                                  <span style={{ color: '#ff9800' }}>
                                    {' → '}{step.delegatedTo.username}（代理）
                                  </span>
                                )}
                              </Typography>

                              {/* コメント */}
                              {step.comment && (
                                <Box sx={{ 
                                  mt: 1, 
                                  p: 1, 
                                  backgroundColor: '#f5f5f5', 
                                  borderRadius: 1,
                                  borderLeft: '3px solid #1976d2'
                                }}>
                                  <Typography variant="body2">
                                    💬 {step.comment}
                                  </Typography>
                                </Box>
                              )}

                              {/* 時間情報 */}
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  開始: {new Date(step.assignedAt).toLocaleString('ja-JP')}
                                </Typography>
                                {step.completedAt && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    完了: {new Date(step.completedAt).toLocaleString('ja-JP')}
                                    {duration !== null && (
                                      <span style={{ marginLeft: 8, color: '#4caf50' }}>
                                        （{duration}時間で完了）
                                      </span>
                                    )}
                                  </Typography>
                                )}
                                {step.dueAt && (
                                  <Typography 
                                    variant="caption" 
                                    color={isOverdue ? 'error.main' : 'text.secondary'}
                                    sx={{ display: 'block' }}
                                  >
                                    期限: {new Date(step.dueAt).toLocaleString('ja-JP')}
                                    {isOverdue && ' ⚠️ 期限切れ'}
                                  </Typography>
                                )}
                              </Box>

                              {/* 期限切れ警告 */}
                              {isOverdue && (
                                <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                                  <Typography variant="caption">
                                    このステップは期限を超過しています
                                  </Typography>
                                </Alert>
                              )}
                            </Box>
                          </TimelineContent>
                        </TimelineItem>
                      );
                    })}
                  </Timeline>
                </AccordionDetails>
              </Accordion>
            )}

            {/* 承認フロー全体の統計情報 */}
            {approvalInstance && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  フロー情報
                </Typography>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    開始日時: {new Date(approvalInstance.startedAt).toLocaleString('ja-JP')}
                  </Typography>
                  {approvalInstance.completedAt && (
                    <Typography variant="caption" color="text.secondary">
                      完了日時: {new Date(approvalInstance.completedAt).toLocaleString('ja-JP')}
                    </Typography>
                  )}
                  {approvalInstance.dueAt && (
                    <Typography 
                      variant="caption" 
                      color={
                        !approvalInstance.completedAt && new Date() > new Date(approvalInstance.dueAt) 
                          ? 'error.main' 
                          : 'text.secondary'
                      }
                    >
                      全体期限: {new Date(approvalInstance.dueAt).toLocaleString('ja-JP')}
                      {!approvalInstance.completedAt && new Date() > new Date(approvalInstance.dueAt) && ' ⚠️ 期限切れ'}
                    </Typography>
                  )}
                  {approvalInstance.metadata && Object.keys(approvalInstance.metadata).length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        追加情報:
                      </Typography>
                      {Object.entries(approvalInstance.metadata).map(([key, value]) => (
                        <Typography key={key} variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                          {key}: {String(value)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* 承認フロー開始ダイアログ */}
        <Dialog 
          open={startDialogOpen} 
          onClose={() => setStartDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>承認フローの開始</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>ワークフロー</InputLabel>
              <Select
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                label="ワークフロー"
              >
                {workflowDefinitions.map((workflow) => (
                  <MenuItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                    {workflow.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({workflow.description})
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStartDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleStartApproval}
              variant="contained"
              disabled={!selectedWorkflow || actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} /> : '開始'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* アクション実行ダイアログ */}
        <Dialog 
          open={actionDialogOpen} 
          onClose={() => setActionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{selectedAction?.actionLabel}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="コメント"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="コメントを入力してください（任意）"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleExecuteAction}
              variant="contained"
              color={selectedAction?.actionKey === 'approve' ? 'success' : 'primary'}
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} /> : '実行'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ApprovalSection;