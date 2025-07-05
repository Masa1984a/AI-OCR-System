import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { workflowApi } from '../services/api';

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  states?: any[];
}

const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await workflowApi.getDefinitions();
      setWorkflows(response.data);
    } catch (err: any) {
      console.error('Failed to load workflows:', err);
      setError('ワークフロー定義の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!formData.name.trim()) {
      setError('ワークフロー名を入力してください');
      return;
    }

    try {
      setFormLoading(true);
      const newWorkflow = {
        name: formData.name,
        description: formData.description || undefined,
      };

      await workflowApi.createDefinition(newWorkflow);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      await loadWorkflows();
    } catch (err: any) {
      console.error('Failed to create workflow:', err);
      setError('ワークフローの作成に失敗しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!window.confirm('このワークフロー定義を削除しますか？')) {
      return;
    }

    try {
      await workflowApi.deleteDefinition(workflowId);
      await loadWorkflows();
    } catch (err: any) {
      console.error('Failed to delete workflow:', err);
      setError('ワークフローの削除に失敗しました');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? 'アクティブ' : '非アクティブ';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 10 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ワークフロー管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          新規作成
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {workflows.map((workflow) => (
          <Grid item xs={12} md={6} lg={4} key={workflow.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                    {workflow.name}
                  </Typography>
                  <Chip
                    label={getStatusLabel(workflow.isActive)}
                    color={getStatusColor(workflow.isActive)}
                    size="small"
                  />
                </Box>

                {workflow.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {workflow.description}
                  </Typography>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    バージョン: {workflow.version}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    作成日: {new Date(workflow.createdAt).toLocaleDateString('ja-JP')}
                  </Typography>
                  {workflow.states && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      状態数: {workflow.states.length}
                    </Typography>
                  )}
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigate(`/workflow-builder?id=${workflow.id}`);
                    }}
                    title="ワークフロービルダーで表示"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigate(`/workflow-builder?id=${workflow.id}&mode=edit`);
                    }}
                    title="ワークフロービルダーで編集"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {workflows.length === 0 && !loading && (
          <Grid item xs={12}>
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                ワークフロー定義がありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                新規作成ボタンから最初のワークフローを作成してください
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* 新規作成ダイアログ */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新しいワークフロー定義を作成</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="ワークフロー名"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="説明（任意）"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleCreateWorkflow}
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={20} /> : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkflowsPage;