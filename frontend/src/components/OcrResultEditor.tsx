import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Undo as UndoIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

interface BlockDefinition {
  block_id: string;
  label: string;
  prompt?: string;
  schema: any;
}

interface SelectedBlock {
  blockId: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  extractionResult?: any;
  croppedImageUrl?: string;
  rawResponse?: string;
  isProcessing?: boolean;
}

interface OcrResultEditorProps {
  block: SelectedBlock;
  blockDefinition: BlockDefinition;
  onSave: (blockId: string, correctedData: any) => Promise<void>;
  onCancel?: () => void;
  readonly?: boolean;
}

const OcrResultEditor: React.FC<OcrResultEditorProps> = ({
  block,
  blockDefinition,
  onSave,
  onCancel,
  readonly = false,
}) => {
  const [editedData, setEditedData] = useState<any>({});
  const [originalData, setOriginalData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isModified, setIsModified] = useState(false);

  // 初期データの設定
  useEffect(() => {
    if (block.extractionResult && !block.extractionResult.error) {
      const data = typeof block.extractionResult === 'string' 
        ? JSON.parse(block.extractionResult) 
        : block.extractionResult;
      setOriginalData(data);
      setEditedData(data);
    }
  }, [block.extractionResult]);

  // 変更検知
  useEffect(() => {
    const modified = JSON.stringify(editedData) !== JSON.stringify(originalData);
    setIsModified(modified);
  }, [editedData, originalData]);

  // スキーマからフィールドを生成
  const renderField = (key: string, schema: any, value: any, path: string = '') => {
    const fieldPath = path ? `${path}.${key}` : key;
    const fieldError = errors[fieldPath];

    if (schema.type === 'object' && schema.properties) {
      return (
        <Box key={key} sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {schema.title || key}
          </Typography>
          {schema.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {schema.description}
            </Typography>
          )}
          <Box sx={{ pl: 2, borderLeft: '2px solid #e0e0e0' }}>
            {Object.entries(schema.properties).map(([subKey, subSchema]: [string, any]) =>
              renderField(subKey, subSchema, value?.[subKey], fieldPath)
            )}
          </Box>
        </Box>
      );
    }

    if (schema.type === 'array') {
      return (
        <Box key={key} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {schema.title || key}
          </Typography>
          {Array.isArray(value) ? (
            value.map((item, index) => (
              <Box key={index} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {JSON.stringify(item, null, 2)}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              配列データがありません
            </Typography>
          )}
        </Box>
      );
    }

    // 基本的なフィールドタイプ
    const handleFieldChange = (newValue: any) => {
      const keys = fieldPath.split('.');
      const newData = { ...editedData };
      
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = newValue;
      
      setEditedData(newData);
      
      // バリデーション
      if (schema.required && !newValue) {
        setErrors(prev => ({ ...prev, [fieldPath]: 'この項目は必須です' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldPath];
          return newErrors;
        });
      }
    };

    // enum の場合はセレクトボックス
    if (schema.enum) {
      return (
        <FormControl key={key} fullWidth sx={{ mb: 2 }} error={!!fieldError}>
          <InputLabel>{schema.title || key}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => handleFieldChange(e.target.value)}
            label={schema.title || key}
            disabled={readonly}
          >
            {schema.enum.map((option: any) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {fieldError && <FormHelperText>{fieldError}</FormHelperText>}
          {schema.description && !fieldError && (
            <FormHelperText>{schema.description}</FormHelperText>
          )}
        </FormControl>
      );
    }

    // boolean の場合はスイッチ
    if (schema.type === 'boolean') {
      return (
        <FormControlLabel
          key={key}
          control={
            <Switch
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(e.target.checked)}
              disabled={readonly}
            />
          }
          label={schema.title || key}
          sx={{ mb: 2 }}
        />
      );
    }

    // number の場合
    if (schema.type === 'number' || schema.type === 'integer') {
      return (
        <TextField
          key={key}
          fullWidth
          label={schema.title || key}
          type="number"
          value={value || ''}
          onChange={(e) => {
            const numValue = schema.type === 'integer' 
              ? parseInt(e.target.value) || 0
              : parseFloat(e.target.value) || 0;
            handleFieldChange(numValue);
          }}
          error={!!fieldError}
          helperText={fieldError || schema.description}
          InputProps={{ readOnly: readonly }}
          sx={{ mb: 2 }}
        />
      );
    }

    // date の場合
    if (schema.format === 'date' || schema.format === 'date-time') {
      return (
        <TextField
          key={key}
          fullWidth
          label={schema.title || key}
          type={schema.format === 'date' ? 'date' : 'datetime-local'}
          value={value || ''}
          onChange={(e) => handleFieldChange(e.target.value)}
          error={!!fieldError}
          helperText={fieldError || schema.description}
          InputProps={{ readOnly: readonly }}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
      );
    }

    // 複数行テキストの場合
    if (schema.type === 'string' && (schema.maxLength > 100 || schema.description?.includes('複数行'))) {
      return (
        <TextField
          key={key}
          fullWidth
          multiline
          rows={3}
          label={schema.title || key}
          value={value || ''}
          onChange={(e) => handleFieldChange(e.target.value)}
          error={!!fieldError}
          helperText={fieldError || schema.description}
          InputProps={{ readOnly: readonly }}
          sx={{ mb: 2 }}
        />
      );
    }

    // デフォルトは単一行テキスト
    return (
      <TextField
        key={key}
        fullWidth
        label={schema.title || key}
        value={value || ''}
        onChange={(e) => handleFieldChange(e.target.value)}
        error={!!fieldError}
        helperText={fieldError || schema.description}
        InputProps={{ readOnly: readonly }}
        sx={{ mb: 2 }}
      />
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(block.blockId, editedData);
      setOriginalData(editedData);
      setIsModified(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    setEditedData(originalData);
    setErrors({});
  };

  // エラー状態の場合
  if (block.extractionResult?.error) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {block.extractionResult.error}
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            OCRエラーが発生しました。範囲を再選択してください。
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // 処理中の場合
  if (block.isProcessing) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            OCR処理中...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // OCR結果がない場合
  if (!block.extractionResult) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            OCR結果がありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {blockDefinition.label} - 点検補正
          </Typography>
        </Box>

        {/* ステータス表示 */}
        <Box mb={2}>
          {isModified && !readonly && (
            <Chip 
              label="未保存の変更あり" 
              color="warning" 
              size="small" 
              sx={{ mr: 1 }}
            />
          )}
          {readonly && (
            <Chip 
              label="読み取り専用" 
              color="default" 
              size="small" 
              sx={{ mr: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* フォーム表示 */}
        <Box>
          {blockDefinition.schema?.properties ? (
            Object.entries(blockDefinition.schema.properties).map(([key, schema]: [string, any]) =>
              renderField(key, schema, editedData[key])
            )
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                スキーマ定義がありません。Raw データを確認してください。
              </Typography>
              <pre style={{
                fontSize: '12px',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {JSON.stringify(editedData, null, 2)}
              </pre>
            </Box>
          )}
        </Box>

        {/* 操作ボタン */}
        {!readonly && (
          <Box mt={3} display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isModified || saving || Object.keys(errors).length > 0}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={handleUndo}
              disabled={!isModified || saving}
            >
              元に戻す
            </Button>
            {onCancel && (
              <Button
                variant="text"
                onClick={onCancel}
                disabled={saving}
              >
                キャンセル
              </Button>
            )}
          </Box>
        )}

        {/* エラー表示 */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              入力内容に問題があります。赤色のフィールドを確認してください。
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default OcrResultEditor;