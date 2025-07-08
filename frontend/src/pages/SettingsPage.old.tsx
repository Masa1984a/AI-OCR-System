import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
  SelectChangeEvent,
  TextField,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { Save, Settings as SettingsIcon, SmartToy, Psychology } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { tenantApi } from '../services/api';

interface LLMSettings {
  defaultModel: string;
  enabledModels: string[];
  modelConfigs?: {
    [key: string]: {
      apiKey?: string;
      maxTokens?: number;
      temperature?: number;
    };
  };
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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
    defaultModel: 'claude-3-5-sonnet-20241022',
    enabledModels: ['claude-3-5-sonnet-20241022'],
    modelConfigs: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // LLM設定の読み込み
  useEffect(() => {
    loadLLMSettings();
  }, []);

  const loadLLMSettings = async () => {
    try {
      setLoading(true);
      const response = await tenantApi.getLLMSettings();
      setLlmSettings(response.data);
    } catch (error: any) {
      console.error('Failed to load LLM settings:', error);
      setError('LLM設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDefaultModelChange = (event: SelectChangeEvent<'claude' | 'gemini'>) => {
    const newModel = event.target.value as 'claude' | 'gemini';
    setLlmSettings(prev => ({
      ...prev,
      defaultModel: newModel,
      // デフォルトモデルが有効モデルに含まれていない場合は追加
      enabledModels: prev.enabledModels.includes(newModel) 
        ? prev.enabledModels 
        : [...prev.enabledModels, newModel],
    }));
  };

  const handleEnabledModelsChange = (model: 'claude' | 'gemini') => {
    setLlmSettings(prev => {
      const isCurrentlyEnabled = prev.enabledModels.includes(model);
      let newEnabledModels: ('claude' | 'gemini')[];
      
      if (isCurrentlyEnabled) {
        // モデルを無効にする場合、デフォルトモデルは無効にできない
        if (model === prev.defaultModel) {
          return prev; // 変更しない
        }
        newEnabledModels = prev.enabledModels.filter(m => m !== model);
      } else {
        // モデルを有効にする場合
        newEnabledModels = [...prev.enabledModels, model];
      }
      
      return {
        ...prev,
        enabledModels: newEnabledModels,
      };
    });
  };

  const handleClaudeModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLlmSettings(prev => ({
      ...prev,
      claudeModel: event.target.value,
    }));
  };

  const saveLLMSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await tenantApi.updateLLMSettings(llmSettings);
      setSuccessMessage('LLM設定が保存されました');
    } catch (error: any) {
      console.error('Failed to save LLM settings:', error);
      setError('LLM設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 管理者のみアクセス可能
  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          この機能は管理者のみアクセス可能です。
        </Alert>
      </Container>
    );
  }

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" />
          システム設定
        </Typography>
        <Typography variant="body1" color="text.secondary">
          システムの動作設定を管理します
        </Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label="AI・OCR設定"
              icon={<SmartToy />}
              iconPosition="start"
              id="settings-tab-0"
              aria-controls="settings-tabpanel-0"
            />
            {/* 将来的に他の設定タブを追加可能 */}
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology color="primary" />
              LLMモデル設定
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              OCR処理に使用するAIモデルを設定します。設定はテナント全体に適用されます。
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* デフォルトモデル選択 */}
              <FormControl fullWidth>
                <InputLabel>デフォルトモデル</InputLabel>
                <Select
                  value={llmSettings.defaultModel}
                  label="デフォルトモデル"
                  onChange={handleDefaultModelChange}
                >
                  <MenuItem value="claude">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Psychology color="primary" />
                      Claude 4 Sonnet
                    </Box>
                  </MenuItem>
                  <MenuItem value="gemini">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmartToy color="secondary" />
                      Gemini 2.0 Flash
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Divider />

              {/* 有効なモデルの選択 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  有効なモデル
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={llmSettings.enabledModels.includes('claude')}
                        onChange={() => handleEnabledModelsChange('claude')}
                        disabled={llmSettings.defaultModel === 'claude'}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Psychology color="primary" />
                        Claude 4 Sonnet
                        {llmSettings.defaultModel === 'claude' && (
                          <Chip label="デフォルト" size="small" color="primary" />
                        )}
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={llmSettings.enabledModels.includes('gemini')}
                        onChange={() => handleEnabledModelsChange('gemini')}
                        disabled={llmSettings.defaultModel === 'gemini'}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToy color="secondary" />
                        Gemini 2.0 Flash
                        {llmSettings.defaultModel === 'gemini' && (
                          <Chip label="デフォルト" size="small" color="primary" />
                        )}
                      </Box>
                    }
                  />
                </Box>
              </Box>

              <Divider />

              {/* Claude モデル詳細設定 */}
              {llmSettings.enabledModels.includes('claude') && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Claude モデル詳細設定
                  </Typography>
                  <TextField
                    fullWidth
                    label="Claude モデル名"
                    value={llmSettings.claudeModel || ''}
                    onChange={handleClaudeModelChange}
                    helperText="使用するClaudeモデルのバージョンを指定します（例: claude-4-sonnet-20250514）"
                  />
                </Box>
              )}

              {/* 保存ボタン */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                <Button
                  variant="contained"
                  onClick={saveLLMSettings}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                >
                  {saving ? '保存中...' : 'LLM設定を保存'}
                </Button>
              </Box>
            </Box>
          </Box>
        </TabPanel>
      </Card>

      {/* 成功メッセージ */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}