import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Typography,
  Box
} from '@mui/material';
import { tenantApi } from '../services/api';

interface LLMModelSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (model: string, dontShowAgain: boolean) => void;
}

export const LLMModelSelectionDialog: React.FC<LLMModelSelectionDialogProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('claude');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleSave = async () => {
    try {
      // LLMモデル設定をサーバーに保存
      await tenantApi.updateSettings({
        llmModel: selectedModel
      });
      
      // ダイアログの設定を保存
      onSave(selectedModel, dontShowAgain);
      onClose();
    } catch (error) {
      console.error('Failed to save LLM model setting:', error);
      // エラーが発生してもダイアログを閉じる
      onSave(selectedModel, dontShowAgain);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        LLMモデル選択ダイアログ
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ログイン時にLLMモデル選択ダイアログを表示します。使用するLLMモデルを選択してください。この設定は後で変更することも可能です。
          </Typography>
          
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">モデル選択</FormLabel>
            <RadioGroup
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="claude"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Claude 4 Sonnet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      高精度な文書解析と自然な対話が可能
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="openai"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      ChatGPT (GPT-4o)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      多言語対応、高精度な画像解析とテキスト認識
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="gemini"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Gemini 2.0 Flash
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      多様なファイル形式に対応、高速処理
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          <FormGroup sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
              }
              label="次回ログイン時にこのダイアログを表示しない"
            />
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="primary">
          キャンセル
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};