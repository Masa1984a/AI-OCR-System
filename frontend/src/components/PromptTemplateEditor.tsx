import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  TextField,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Collapse,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
  Preview,
  FilterList,
} from '@mui/icons-material';
import { deletePromptTemplate } from '../services/api';

interface PromptTemplate {
  id?: string;
  blockId?: string | null;
  role: 'system' | 'user' | 'assistant' | 'fewshot';
  content: string;
  sequenceOrder: number;
  isActive: boolean;
}

interface PromptTemplateEditorProps {
  templateId: string;
  prompts: PromptTemplate[];
  onChange: (prompts: PromptTemplate[]) => void;
  schemaJson?: any;
  blocks?: Array<{ block_id: string; label: string }>;
}

const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({
  templateId,
  prompts,
  onChange,
  schemaJson,
  blocks = [],
}) => {
  const [editDialog, setEditDialog] = useState<{
    prompt: PromptTemplate;
    index: number;
  } | null>(null);
  const [previewDialog, setPreviewDialog] = useState<PromptTemplate | null>(null);
  const [filterCommonOnly, setFilterCommonOnly] = useState(false);
  const [filterBlockId, setFilterBlockId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const addPrompt = () => {
    const newPrompt: PromptTemplate = {
      blockId: null,
      role: 'user',
      content: '',
      sequenceOrder: prompts.length,
      isActive: true,
    };
    setEditDialog({ prompt: newPrompt, index: -1 });
  };

  const editPrompt = (prompt: PromptTemplate, index: number) => {
    setEditDialog({ prompt: { ...prompt }, index });
  };

  const savePrompt = (updatedPrompt: PromptTemplate) => {
    if (editDialog) {
      // バリデーション: ブロックIDが存在するかチェック
      if (updatedPrompt.blockId && !blocks.find(b => b.block_id === updatedPrompt.blockId)) {
        alert(`ブロック "${updatedPrompt.blockId}" が存在しません。ブロック定義を確認してください。`);
        return;
      }

      let newPrompts = [...prompts];
      if (editDialog.index === -1) {
        // Adding new prompt
        newPrompts.push(updatedPrompt);
      } else {
        // Updating existing prompt
        newPrompts[editDialog.index] = updatedPrompt;
      }
      onChange(newPrompts);
      setEditDialog(null);
    }
  };

  // プロンプト内容変更のメモ化されたハンドラー
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (editDialog) {
      setEditDialog({
        ...editDialog,
        prompt: { ...editDialog.prompt, content: e.target.value }
      });
    }
  }, [editDialog]);

  const handleDeletePrompt = async (promptToDelete: PromptTemplate) => {
    // If the prompt doesn't have an ID, it hasn't been saved to the backend yet.
    // We can just remove it from the local state.
    if (!promptToDelete.id) {
      const newPrompts = prompts.filter(p => p !== promptToDelete);
      onChange(newPrompts.map((p, i) => ({ ...p, sequenceOrder: i })));
      return;
    }

    try {
      await deletePromptTemplate(promptToDelete.id);
      const newPrompts = prompts.filter(p => p.id !== promptToDelete.id);
      onChange(newPrompts.map((p, i) => ({ ...p, sequenceOrder: i })));
    } catch (error) {
      console.error('Failed to delete prompt template', error);
      alert('プロンプトの削除に失敗しました。');
    }
  };

  const movePrompt = (fromIndex: number, toIndex: number) => {
    const newPrompts = [...prompts];
    const [movedPrompt] = newPrompts.splice(fromIndex, 1);
    newPrompts.splice(toIndex, 0, movedPrompt);
    // Reorder sequence
    const reordered = newPrompts.map((p, i) => ({ ...p, sequenceOrder: i }));
    onChange(reordered);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'system': return 'システム';
      case 'user': return 'ユーザー';
      case 'assistant': return 'アシスタント';
      case 'fewshot': return 'Few-shot例';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system': return 'primary';
      case 'user': return 'success';
      case 'assistant': return 'info';
      case 'fewshot': return 'warning';
      default: return 'default';
    }
  };

  const getBlockLabel = (blockId: string | null) => {
    if (!blockId) {
      return { label: '全体', color: 'default' as const };
    }
    const block = blocks.find(b => b.block_id === blockId);
    return {
      label: block ? `ブロック: ${block.label}` : `ブロック: ${blockId}`,
      color: 'info' as const
    };
  };

  const processPlaceholders = (content: string) => {
    if (!schemaJson) return content;

    const variables = {
      schema: JSON.stringify(schemaJson, null, 2),
      exampleJSON: JSON.stringify(generateExample(schemaJson), null, 2),
      fieldList: Object.keys(schemaJson.properties || {}).join(', '),
    };

    let processed = content;
    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return processed;
  };

  const generateExample = (schema: any) => {
    if (!schema.properties) return {};
    const example: any = {};
    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
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
        default:
          example[key] = null;
      }
    });
    return example;
  };

  const getFilteredPrompts = () => {
    let filtered = prompts;

    if (filterCommonOnly) {
      filtered = filtered.filter(prompt => !prompt.blockId);
    } else if (filterBlockId) {
      filtered = filtered.filter(prompt => prompt.blockId === filterBlockId);
    }

    return filtered.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">プロンプトテンプレート</Typography>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "contained" : "outlined"}
            size="small"
          >
            フィルター
          </Button>
          <Button startIcon={<Add />} onClick={addPrompt}>
            プロンプト追加
          </Button>
        </Box>
      </Box>

      <Collapse in={showFilters}>
        <Box display="flex" gap={2} mb={3} p={2} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filterCommonOnly}
                onChange={(e) => {
                  setFilterCommonOnly(e.target.checked);
                  if (e.target.checked) {
                    setFilterBlockId('');
                  }
                }}
              />
            }
            label="共通プロンプトのみ"
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>ブロック別</InputLabel>
            <Select
              value={filterBlockId}
              onChange={(e) => {
                setFilterBlockId(e.target.value);
                if (e.target.value) {
                  setFilterCommonOnly(false);
                }
              }}
              disabled={filterCommonOnly}
            >
              <MenuItem value="">すべて</MenuItem>
              {blocks.map((block) => (
                <MenuItem key={block.block_id} value={block.block_id}>
                  {block.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setFilterCommonOnly(false);
              setFilterBlockId('');
            }}
          >
            リセット
          </Button>
        </Box>
      </Collapse>

      {prompts.length === 0 ? (
        <Alert severity="info">
          プロンプトテンプレートが設定されていません。デフォルトプロンプトが使用されます。
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {getFilteredPrompts().map((prompt, displayIndex) => {
            const realIndex = prompts.findIndex(p => p === prompt);
            return (
              <Grid item xs={12} key={displayIndex}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton size="small">
                          <DragIndicator />
                        </IconButton>
                        <Chip
                          label={getRoleLabel(prompt.role)}
                          color={getRoleColor(prompt.role) as any}
                          size="small"
                        />
                        <Chip
                          label={getBlockLabel(prompt.blockId).label}
                          color={getBlockLabel(prompt.blockId).color}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption">
                          順序: {prompt.sequenceOrder + 1}
                        </Typography>
                        {!prompt.isActive && (
                          <Chip label="無効" size="small" color="default" />
                        )}
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => setPreviewDialog(prompt)}
                        >
                          <Preview />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => editPrompt(prompt, realIndex)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeletePrompt(prompt)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        maxHeight: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {prompt.content.substring(0, 200)}
                      {prompt.content.length > 200 && '...'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editDialog}
        onClose={() => setEditDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDialog?.index === -1 ? 'プロンプト追加' : 'プロンプト編集'}
        </DialogTitle>
        <DialogContent>
          {editDialog && (
            <Box display="flex" flexDirection="column" gap={3} mt={2}>
              <FormControl fullWidth>
                <InputLabel>ロール</InputLabel>
                <Select
                  value={editDialog.prompt.role}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    prompt: { ...editDialog.prompt, role: e.target.value as any }
                  })}
                >
                  <MenuItem value="system">システム</MenuItem>
                  <MenuItem value="user">ユーザー</MenuItem>
                  <MenuItem value="assistant">アシスタント</MenuItem>
                  <MenuItem value="fewshot">Few-shot例</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>対象ブロック</InputLabel>
                <Select
                  value={editDialog.prompt.blockId || ''}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    prompt: { ...editDialog.prompt, blockId: e.target.value || null }
                  })}
                >
                  <MenuItem value="">全体（共通プロンプト）</MenuItem>
                  {blocks.map((block) => (
                    <MenuItem key={block.block_id} value={block.block_id}>
                      {block.label} ({block.block_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="プロンプト内容"
                value={editDialog.prompt.content}
                onChange={handleContentChange}
                fullWidth
                multiline
                rows={12}
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                    fontSize: '0.875rem',
                  }
                }}
                helperText="使用可能な変数: {{schema}}, {{exampleJSON}}, {{fieldList}}"
              />

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>利用可能な変数:</strong><br />
                  • <code>{'{{schema}}'}</code> - JSON Schema定義<br />
                  • <code>{'{{exampleJSON}}'}</code> - サンプルJSON<br />
                  • <code>{'{{fieldList}}'}</code> - フィールド一覧
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>キャンセル</Button>
          <Button
            onClick={() => editDialog && savePrompt(editDialog.prompt)}
            variant="contained"
            disabled={!editDialog?.prompt.content}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewDialog}
        onClose={() => setPreviewDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>プロンプトプレビュー</DialogTitle>
        <DialogContent>
          {previewDialog && (
            <Box>
              <Box mb={2}>
                <Chip
                  label={getRoleLabel(previewDialog.role)}
                  color={getRoleColor(previewDialog.role) as any}
                  size="small"
                />
              </Box>
              <Typography variant="h6" gutterBottom>
                変数置換前:
              </Typography>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.875rem',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap',
              }}>
                {previewDialog.content}
              </pre>
              
              <Typography variant="h6" gutterBottom>
                変数置換後:
              </Typography>
              <pre style={{
                backgroundColor: '#e3f2fd',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.875rem',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                whiteSpace: 'pre-wrap',
              }}>
                {processPlaceholders(previewDialog.content)}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptTemplateEditor;