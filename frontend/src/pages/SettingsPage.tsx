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
  FormGroup,
  Autocomplete,
  Stack,
} from '@mui/material';
import { Save, Settings as SettingsIcon, SmartToy, Psychology, AutoAwesome } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { tenantApi, ocrApi } from '../services/api';

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

interface AvailableModel {
  model: string;
  displayName: string;
  provider: string;
  description?: string;
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

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'claude':
      return <Psychology color="primary" />;
    case 'chatgpt':
      return <SmartToy color="secondary" />;
    case 'gemini':
      return <AutoAwesome color="warning" />;
    default:
      return <SmartToy />;
  }
};

const getProviderColor = (provider: string) => {
  switch (provider) {
    case 'claude':
      return 'primary';
    case 'chatgpt':
      return 'secondary';
    case 'gemini':
      return 'warning';
    default:
      return 'default';
  }
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
    defaultModel: '',
    enabledModels: [],
    modelConfigs: {},
  });
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // LLM設定と利用可能なモデルの読み込み
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsResponse, modelsResponse] = await Promise.all([
        tenantApi.getLLMSettings(),
        ocrApi.getAvailableModels(),
      ]);
      
      setLlmSettings(settingsResponse.data);
      setAvailableModels(modelsResponse.data.models || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      setError('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDefaultModelChange = (event: SelectChangeEvent<string>) => {
    const newModel = event.target.value;
    setLlmSettings(prev => ({
      ...prev,
      defaultModel: newModel,
      // デフォルトモデルが有効モデルに含まれていない場合は追加
      enabledModels: prev.enabledModels.includes(newModel) 
        ? prev.enabledModels 
        : [...prev.enabledModels, newModel],
    }));
  };

  const handleEnabledModelsChange = (event: React.SyntheticEvent, value: string[]) => {
    // デフォルトモデルは必ず有効にする
    const newEnabledModels = value.includes(llmSettings.defaultModel) 
      ? value 
      : [...value, llmSettings.defaultModel];
    
    setLlmSettings(prev => ({
      ...prev,
      enabledModels: newEnabledModels,
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

  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AvailableModel[]>);

  // Admin権限がない場合は表示しない
  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          この機能にアクセスする権限がありません。
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        <SettingsIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
        システム設定
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="LLMモデル設定" />
              <Tab label="その他の設定" disabled />
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
                    {availableModels.map((model) => (
                      <MenuItem key={model.model} value={model.model}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getProviderIcon(model.provider)}
                          <Box>
                            <Typography variant="body1">{model.displayName}</Typography>
                            {model.description && (
                              <Typography variant="caption" color="text.secondary">
                                {model.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider />

                {/* 有効なモデルの選択 */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    有効なモデル
                  </Typography>
                  <Autocomplete
                    multiple
                    options={availableModels}
                    value={availableModels.filter(m => llmSettings.enabledModels.includes(m.model))}
                    onChange={(event, newValue) => {
                      handleEnabledModelsChange(event, newValue.map(m => m.model));
                    }}
                    groupBy={(option) => option.provider}
                    getOptionLabel={(option) => option.displayName}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          {getProviderIcon(option.provider)}
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2">{option.displayName}</Typography>
                            {option.description && (
                              <Typography variant="caption" color="text.secondary">
                                {option.description}
                              </Typography>
                            )}
                          </Box>
                          {option.model === llmSettings.defaultModel && (
                            <Chip label="デフォルト" size="small" color="primary" />
                          )}
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="使用可能にするモデルを選択"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.displayName}
                          icon={getProviderIcon(option.provider)}
                          color={getProviderColor(option.provider) as any}
                          {...getTagProps({ index })}
                          disabled={option.model === llmSettings.defaultModel}
                        />
                      ))
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    ※ デフォルトモデルは自動的に有効になります
                  </Typography>
                </Box>

                <Divider />

                {/* 保存ボタン */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={saveLLMSettings}
                    disabled={saving || !llmSettings.defaultModel}
                    startIcon={<Save />}
                  >
                    {saving ? '保存中...' : '設定を保存'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* 成功メッセージ */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}