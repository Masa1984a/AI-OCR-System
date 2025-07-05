import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Code,
  Preview,
  Settings,
  FileCopy,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { templateApi, createPromptTemplate, updatePromptTemplate, deletePromptTemplate } from '../services/api';
import PromptTemplateEditor from '../components/PromptTemplateEditor';
import BlockDefinitionEditor from '../components/BlockDefinitionEditor';

interface BlockDefinition {
  block_id: string;
  label: string;
  prompt?: string;
  schema: any;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  version: number;
  schemaJson?: any;
  blocks?: BlockDefinition[];
  isActive: boolean;
  createdAt: string;
  promptTemplates?: PromptTemplate[];
}

interface PromptTemplate {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  blockId?: string | null;
  sequenceOrder: number;
  isActive: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TemplatesPage: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<Template | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    blocks: [] as BlockDefinition[]
  });
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [useBlocks, setUseBlocks] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateApi.list();
      // Handle the response format: { templates: Template[], total: number }
      if (response.data.templates) {
        setTemplates(response.data.templates);
      } else if (Array.isArray(response.data)) {
        setTemplates(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setTemplates([]);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setError('テンプレートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      
      await templateApi.create({
        name: formData.name,
        description: formData.description,
        blocks: formData.blocks
      });

      setCreateDialog(false);
      setFormData({
        name: '',
        description: '',
        blocks: []
      });
      await loadTemplates();
    } catch (err: any) {
      console.error('Failed to create template:', err);
      setError('テンプレートの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editDialog) return;

    try {
      setSubmitting(true);
      
      // テンプレートの全情報を一度に更新
      await templateApi.update(editDialog.id, {
        name: formData.name,
        description: formData.description,
        blocks: formData.blocks
      });

      // プロンプトの保存処理
      const originalPrompts = editDialog.promptTemplates || [];
      const currentPrompts = prompts;

      // 既存プロンプトのIDリスト
      const originalIds = originalPrompts.map(p => p.id);
      const currentIds = currentPrompts.filter(p => p.id).map(p => p.id);

      // 削除されたプロンプトを処理
      const deletedIds = originalIds.filter(id => !currentIds.includes(id));
      for (const id of deletedIds) {
        await deletePromptTemplate(id);
      }

      // 新規プロンプトと更新プロンプトを分離
      const newPrompts = currentPrompts.filter(p => !p.id);
      const existingPrompts = currentPrompts.filter(p => p.id);

      // 既存プロンプトを更新
      for (const prompt of existingPrompts) {
        const originalPrompt = originalPrompts.find(p => p.id === prompt.id);
        if (originalPrompt && JSON.stringify(originalPrompt) !== JSON.stringify(prompt)) {
          await updatePromptTemplate(prompt.id, {
            role: prompt.role,
            content: prompt.content,
            blockId: prompt.blockId,
            sequenceOrder: prompt.sequenceOrder,
            isActive: prompt.isActive
          });
        }
      }

      // 新規プロンプトを作成
      if (newPrompts.length > 0) {
        await createPromptTemplate(editDialog.id, newPrompts.map(p => ({
          role: p.role,
          content: p.content,
          blockId: p.blockId,
          sequenceOrder: p.sequenceOrder,
          isActive: p.isActive
        })));
      }

      setEditDialog(null);
      await loadTemplates();
    } catch (err: any) {
      console.error('Failed to update template:', err);
      setError('テンプレートの更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVersion = async (templateId: string) => {
    try {
      await templateApi.createVersion(templateId);
      await loadTemplates();
    } catch (err: any) {
      console.error('Failed to create version:', err);
      setError('新しいバージョンの作成に失敗しました');
    }
  };

  const openEditDialog = (template: Template) => {
    setEditDialog(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      blocks: template.blocks || []
    });
    setPrompts(template.promptTemplates || []);
    setTabValue(0);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      setDeleting(true);
      await templateApi.delete(deleteDialog.id);
      setDeleteDialog(null);
      await loadTemplates();
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      setError('テンプレートの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const generateExampleFromSchema = (schema: any): any => {
    if (!schema || typeof schema !== 'object') return {};
    
    const example: any = {};
    
    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties[key];
        switch (prop.type) {
          case 'string':
            example[key] = prop.format === 'date' ? '2024-01-01' : `サンプル${key}`;
            break;
          case 'number':
          case 'integer':
            example[key] = 123;
            break;
          case 'boolean':
            example[key] = true;
            break;
          case 'array':
            example[key] = prop.items ? [generateExampleFromSchema(prop.items)] : [];
            break;
          case 'object':
            example[key] = generateExampleFromSchema(prop);
            break;
          default:
            example[key] = null;
        }
      });
    }
    
    return example;
  };

  const previewSchema = () => {
    if (formData.blocks.length === 0) {
      return 'ブロックが定義されていません';
    }
    
    const examples: any = {};
    formData.blocks.forEach(block => {
      examples[block.block_id] = {
        label: block.label,
        example: generateExampleFromSchema(block.schema)
      };
    });
    
    return JSON.stringify(examples, null, 2);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          テンプレート管理
        </Typography>
        {user?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialog(true)}
          >
            新規テンプレート
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              テンプレートが登録されていません。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3">
                      {template.name}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={`v${template.version}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={template.isActive ? '有効' : '無効'}
                        size="small"
                        color={template.isActive ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>
                  
                  {template.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {template.description}
                    </Typography>
                  )}
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="body2">ブロック定義プレビュー</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <pre style={{ 
                        fontSize: '0.75rem', 
                        overflow: 'auto',
                        maxHeight: '200px',
                        margin: 0,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {template.blocks && template.blocks.length > 0
                          ? JSON.stringify(template.blocks, null, 2)
                          : 'ブロック定義がありません'}
                      </pre>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    作成日: {new Date(template.createdAt).toLocaleDateString('ja-JP')}
                  </Typography>
                </CardContent>
                
                {user?.role === 'admin' && (
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => openEditDialog(template)}
                    >
                      編集
                    </Button>
                    <Button
                      size="small"
                      startIcon={<FileCopy />}
                      onClick={() => handleCreateVersion(template.id)}
                    >
                      新バージョン
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => setDeleteDialog(template)}
                    >
                      削除
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>新規テンプレート作成</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="基本情報" />
            <Tab label="ブロック" />
            <Tab label="プロンプト" />
            <Tab label="プレビュー" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <Box display="flex" flexDirection="column" gap={3} mt={2}>
              <TextField
                label="テンプレート名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="説明"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <BlockDefinitionEditor
              blocks={formData.blocks}
              onChange={(blocks) => setFormData({ ...formData, blocks })}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <PromptTemplateEditor
              templateId=""
              prompts={prompts}
              onChange={setPrompts}
              schemaJson={{}}
              blocks={formData.blocks}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              ブロック定義プレビュー
            </Typography>
            <pre style={{ 
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
            }}>
              {previewSchema()}
            </pre>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.name || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : '作成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>テンプレート編集: {editDialog?.name}</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="基本情報" />
            <Tab label="ブロック" />
            <Tab label="プロンプト" />
            <Tab label="プレビュー" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <Box display="flex" flexDirection="column" gap={3} mt={2}>
              <TextField
                label="テンプレート名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="説明"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <BlockDefinitionEditor
              blocks={formData.blocks}
              onChange={(blocks) => setFormData({ ...formData, blocks })}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <PromptTemplateEditor
              templateId={editDialog?.id || ""}
              prompts={prompts}
              onChange={setPrompts}
              schemaJson={{}}
              blocks={formData.blocks}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              ブロック定義プレビュー
            </Typography>
            <pre style={{ 
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
            }}>
              {previewSchema()}
            </pre>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>キャンセル</Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={!formData.name || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : '更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>テンプレートの削除</DialogTitle>
        <DialogContent>
          <Typography>
            テンプレート「{deleteDialog?.name}」を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は取り消せません。関連するドキュメントやプロンプトも使用できなくなります。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>キャンセル</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TemplatesPage;