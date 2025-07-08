import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  PanTool as PanToolIcon,
  CropFree as SelectionIcon,
  PlayArrow as PlayArrowIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  BugReport as BugReportIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { api, documentApi } from '../services/api';
import PdfViewer from '../components/PdfViewer';
import OcrResultEditor from '../components/OcrResultEditor';
import ApprovalSection from '../components/ApprovalSection';
import ApprovalStatusBadge from '../components/ApprovalStatusBadge';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  pageCount: number;
  templateId: string;
  template?: {
    name: string;
    blocks?: BlockDefinition[];
  };
  createdAt: string;
}

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
  extractionId?: string;
  croppedImageUrl?: string;
  rawResponse?: string;
  isProcessing?: boolean;
}

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([]);
  const [currentBlockType, setCurrentBlockType] = useState<string>('');
  const [mode, setMode] = useState<'move' | 'select'>('move');
  
  // UI制御のステート
  const [autoOcr, setAutoOcr] = useState(true);
  const [debugPreviewOpen, setDebugPreviewOpen] = useState(false);
  const [debugData, setDebugData] = useState<{
    croppedImage?: string;
    rawResponse?: string;
    blockLabel?: string;
  } | null>(null);
  const [editingBlock, setEditingBlock] = useState<SelectedBlock | null>(null);
  const [showJsonView, setShowJsonView] = useState<{ [blockId: string]: boolean }>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<SelectedBlock | null>(null);

  useEffect(() => {
    // console.log('DocumentDetailPage useEffect triggered, id:', id);
    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (documentData?.id) {
      // console.log('Document loaded, loading page images');
      // 既存の抽出結果をロード
      fetchExistingExtractions();
    }
  }, [documentData]);

  // Cleanup (no longer needed for blob URLs since we're using PDF directly)

  const fetchDocument = async () => {
    // console.log('fetchDocument called with id:', id);
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/documents/${id}`);
      // console.log('Document API response:', response.data);
      setDocumentData(response.data);
      
      // テンプレート情報も取得
      if (response.data.templateId) {
        const templateResponse = await api.get(`/api/v1/templates/${response.data.templateId}`);
        setDocumentData({
          ...response.data,
          template: templateResponse.data,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'ドキュメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };


  const fetchExistingExtractions = async () => {
    if (!documentData?.id) {
      // console.log('No document ID, skipping extraction fetch');
      return;
    }

    try {
      // console.log('Fetching existing extractions for document:', documentData.id);
      const response = await api.get(`/api/v1/ocr/documents/${documentData.id}/extractions`);
      const extractions = response.data;
      
      // console.log('Existing extractions found:', extractions);

      if (extractions && extractions.length > 0) {
        // 既存の抽出結果をSelectedBlock形式に変換
        const existingBlocks: SelectedBlock[] = extractions.map((extraction: any) => ({
          blockId: extraction.blockId,
          coordinates: extraction.coordinates,
          extractionResult: extraction.extractedData || extraction.content, // extracted_dataを優先、なければcontentを使用
          extractionId: extraction.id,
          isProcessing: false,
        }));

        // console.log('Setting existing blocks:', existingBlocks);
        setSelectedBlocks(existingBlocks);
      }
    } catch (err: any) {
      console.error('Failed to fetch existing extractions:', err);
      // エラーは表示しない（既存データがない場合は正常）
    }
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.1, 0.1));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (documentData) {
      setCurrentPage(prev => Math.min(prev + 1, documentData.pageCount));
    }
  };

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'move' | 'select' | null,
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleSelectionComplete = (rectangle: any) => {
    if (!currentBlockType) return;
    
    const newBlock: SelectedBlock = {
      blockId: currentBlockType,
      coordinates: {
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height,
      },
      isProcessing: true,
    };
    
    // 新しいブロックを追加（既存ブロックは保持）
    setSelectedBlocks(prev => [...prev, newBlock]);
    
    // 自動OCRが有効な場合のみ実行
    if (autoOcr) {
      performOCR(newBlock);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    // console.log('Page changed to:', pageNumber);
    // ページ変更時に選択範囲をクリア（必要に応じて）
  };


  // 画像クロップ・Base64エンコード機能
  const cropImageFromSelection = async (coordinates: { x: number; y: number; width: number; height: number }): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // 現在のページ画像を取得
        const response = await api.get(`/api/v1/documents/${documentData?.id}/pages/${currentPage}`, {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        
        // Image要素を作成してロード
        const img = new Image();
        img.onload = () => {
          try {
            // Canvas要素を作成
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }
            
            // スケールファクターを計算（表示サイズ vs 実際の画像サイズ）
            const scaleX = img.naturalWidth / (img.naturalWidth * scale);
            const scaleY = img.naturalHeight / (img.naturalHeight * scale);
            
            // 実際の画像座標に変換
            const actualX = coordinates.x / scale;
            const actualY = coordinates.y / scale;
            const actualWidth = coordinates.width / scale;
            const actualHeight = coordinates.height / scale;
            
            // Canvas サイズを選択範囲に設定
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            
            // 選択範囲を描画
            ctx.drawImage(
              img,
              actualX, actualY, actualWidth, actualHeight, // ソース座標・サイズ
              0, 0, actualWidth, actualHeight // 描画座標・サイズ
            );
            
            // Canvas を Base64 に変換
            const base64 = canvas.toDataURL('image/png').split(',')[1];
            
            // URL をクリーンアップ
            URL.revokeObjectURL(imageUrl);
            
            // console.log('Image cropped successfully:', {
            //   originalSize: { width: img.naturalWidth, height: img.naturalHeight },
            //   cropArea: { actualX, actualY, actualWidth, actualHeight },
            //   croppedSize: { width: actualWidth, height: actualHeight },
            //   base64Length: base64.length
            // });
            
            resolve(base64);
          } catch (error) {
            URL.revokeObjectURL(imageUrl);
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
      } catch (error) {
        reject(error);
      }
    });
  };

  const performOCR = async (block: SelectedBlock) => {
    try {
      // 処理中ステートを更新
      setSelectedBlocks(prev => 
        prev.map(b => 
          b === block ? { ...b, isProcessing: true } : b
        )
      );

      // console.log('Making OCR API call with coordinates:', {
      //   blockId: block.blockId,
      //   coordinates: block.coordinates,
      //   documentId: documentData?.id,
      //   templateId: documentData?.templateId,
      //   pageNumber: currentPage
      // });
      
      // フロントエンドで画像をクロップしてBase64エンコード
      // console.log('Cropping image from selection...');
      const croppedImageBase64 = await cropImageFromSelection(block.coordinates);
      // console.log('Image cropped successfully, base64 length:', croppedImageBase64.length);
      
      // クロップされた画像をBase64として送信
      const response = await api.post('/api/v1/ocr/extract/block', {
        imageBase64: croppedImageBase64,
        documentId: documentData?.id,
        templateId: documentData?.templateId,
        blockId: block.blockId,
        coordinates: block.coordinates,
      });
      
      // console.log('OCR Response received:', response.data);
      
      // 結果を更新
      setSelectedBlocks(prev => {
        const updatedBlocks = prev.map(b => 
          b.blockId === block.blockId && 
          b.coordinates.x === block.coordinates.x && 
          b.coordinates.y === block.coordinates.y ? { 
            ...b, 
            extractionResult: response.data.content,
            extractionId: response.data.extractionId,
            rawResponse: JSON.stringify(response.data, null, 2),
            croppedImageUrl: `data:image/png;base64,${croppedImageBase64}`, // デバッグ用
            isProcessing: false
          } : b
        );
        return updatedBlocks;
      });
    } catch (err: any) {
      console.error('OCR failed:', err);
      
      // エラーメッセージを設定
      let errorMessage = 'OCR処理中にエラーが発生しました';
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '選択された範囲が無効です。';
      } else if (err.message?.includes('Canvas') || err.message?.includes('image')) {
        errorMessage = '画像の処理中にエラーが発生しました。範囲を再選択してください。';
      }
      
      // エラー時も処理中フラグを解除し、エラーメッセージを設定
      setSelectedBlocks(prev => 
        prev.map(b => 
          b.blockId === block.blockId && 
          b.coordinates.x === block.coordinates.x && 
          b.coordinates.y === block.coordinates.y ? { 
            ...b, 
            isProcessing: false,
            extractionResult: { error: errorMessage },
            rawResponse: JSON.stringify({ error: errorMessage, details: err.response?.data }, null, 2)
          } : b
        )
      );
    }
  };

  // 手動OCR実行（トグルOFF時用）
  const handleManualOCR = (block: SelectedBlock) => {
    performOCR(block);
  };

  // 選択ブロック削除（確認ダイアログ付き）
  const handleDeleteBlock = (blockToDelete: SelectedBlock) => {
    setBlockToDelete(blockToDelete);
    setDeleteConfirmOpen(true);
  };

  // 削除確認後の実際の削除処理
  const confirmDeleteBlock = async () => {
    if (!blockToDelete) return;

    try {
      // バックエンドで論理削除を実行（extractionIdがある場合のみ）
      if (blockToDelete.extractionId) {
        // console.log('Deleting extraction with ID:', blockToDelete.extractionId);
        const deleteResponse = await api.delete(`/api/v1/ocr/extractions/${blockToDelete.extractionId}`);
        // console.log('Delete response:', deleteResponse.data);
        // console.log('Extraction deleted from backend:', blockToDelete.extractionId);
      } else {
        console.warn('No extractionId found for block, only removing from UI');
      }

      // フロントエンドの状態から削除
      setSelectedBlocks(prev => prev.filter(block => 
        !(block.blockId === blockToDelete.blockId && 
          block.coordinates.x === blockToDelete.coordinates.x && 
          block.coordinates.y === blockToDelete.coordinates.y)
      ));

      // 編集中のブロックがこのブロックの場合、編集状態をクリア
      if (editingBlock && editingBlock.blockId === blockToDelete.blockId) {
        setEditingBlock(null);
      }

      // 削除完了
    } catch (error) {
      console.error('Failed to delete extraction:', error);
      // エラーがあってもフロントエンドからは削除する
      setSelectedBlocks(prev => prev.filter(block => 
        !(block.blockId === blockToDelete.blockId && 
          block.coordinates.x === blockToDelete.coordinates.x && 
          block.coordinates.y === blockToDelete.coordinates.y)
      ));
    } finally {
      setDeleteConfirmOpen(false);
      setBlockToDelete(null);
    }
  };

  // JSON表示の切り替え
  const toggleJsonView = (blockId: string) => {
    setShowJsonView(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  // デバッグプレビューを開く
  const handleDebugPreview = (block: SelectedBlock) => {
    const blockDef = document?.template?.blocks?.find(b => b.block_id === block.blockId);
    setDebugData({
      croppedImage: block.croppedImageUrl,
      rawResponse: block.rawResponse,
      blockLabel: blockDef?.label
    });
    setDebugPreviewOpen(true);
  };

  // 点検補正エディターを開く（JSON表示時のみ使用）
  const handleEditOcrResult = (block: SelectedBlock) => {
    // JSON表示を無効にして編集フォームを表示
    setShowJsonView(prev => ({ ...prev, [block.blockId]: false }));
  };

  // OCR結果の修正を保存
  const handleSaveOcrCorrection = async (blockId: string, correctedData: any) => {
    const block = selectedBlocks.find(b => b.blockId === blockId);
    if (!block?.extractionId) {
      throw new Error('抽出IDが見つかりません');
    }

    try {
      const response = await api.patch(`/api/v1/ocr/extractions/${block.extractionId}`, {
        correctedData,
        correctionReason: '手動修正',
      });

      // console.log('OCR correction saved:', response.data);

      // ローカルステートを更新
      setSelectedBlocks(prev => 
        prev.map(b => 
          b.blockId === blockId ? { 
            ...b, 
            extractionResult: correctedData,
            // extractionIdは既に持っているはず
          } : b
        )
      );

      setEditingBlock(null);
    } catch (error) {
      console.error('Failed to save OCR correction:', error);
      throw error;
    }
  };


  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !documentData) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error || 'ドキュメントが見つかりません'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box my={3}>
        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/documents')}
          >
            ドキュメント一覧に戻る
          </Button>
          <ApprovalStatusBadge documentId={documentData.id} />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: 'calc(70vh + 120px)' }}>
            <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">{documentData.fileName}</Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  {/* モード切り替えコントロール */}
                  <Box display="flex" alignItems="center">
                    <ToggleButtonGroup
                      value={mode}
                      exclusive
                      onChange={handleModeChange}
                      size="small"
                    >
                      <ToggleButton value="move" aria-label="移動">
                        <PanToolIcon sx={{ mr: 1 }} />
                        移動
                      </ToggleButton>
                      <ToggleButton value="select" aria-label="範囲選択">
                        <SelectionIcon sx={{ mr: 1 }} />
                        範囲選択
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  
                  <Divider orientation="vertical" flexItem />
                  
                  {/* 自動OCRトグル */}
                  <Box display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoOcr}
                          onChange={(e) => setAutoOcr(e.target.checked)}
                          size="small"
                        />
                      }
                      label="自動OCR"
                      sx={{ m: 0 }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />
              
              {/* 選択範囲のプレビュー（削除済み） */}

              {/* PDFビューアー全体コンテナ */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* PDFビューア */}
                <Box
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    flex: '1',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                  }}
                >
                  <PdfViewer
                    documentId={documentData.id}
                    pageCount={documentData.pageCount}
                    currentPage={currentPage}
                    scale={scale}
                    mode={mode}
                    onPageChange={handlePageChange}
                    onSelectionComplete={handleSelectionComplete}
                  />
                </Box>

                {/* ページナビゲーションと拡大縮小コントロール */}
                <Box display="flex" justifyContent="center" alignItems="center" gap={3} sx={{ py: 2, borderTop: '1px solid #e0e0e0', height: '120px', flexShrink: 0 }}>
                {/* ページナビゲーション */}
                <Box display="flex" alignItems="center">
                  <Tooltip title="前のページ">
                    <span>
                      <IconButton 
                        onClick={handlePreviousPage} 
                        disabled={currentPage <= 1}
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography component="span" sx={{ mx: 2, minWidth: '80px', textAlign: 'center' }}>
                    {currentPage} / {documentData.pageCount}
                  </Typography>
                  <Tooltip title="次のページ">
                    <span>
                      <IconButton 
                        onClick={handleNextPage} 
                        disabled={currentPage >= documentData.pageCount}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                
                <Divider orientation="vertical" flexItem />
                
                {/* ズームコントロール */}
                <Box display="flex" alignItems="center">
                  <Tooltip title="ズームアウト">
                    <IconButton onClick={handleZoomOut}>
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography component="span" sx={{ mx: 2, minWidth: '60px', textAlign: 'center' }}>
                    {Math.round(scale * 100)}%
                  </Typography>
                  <Tooltip title="ズームイン">
                    <IconButton onClick={handleZoomIn}>
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                </Box>
              </Box>

            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            {/* スクロール可能な統合パネル */}
            <Box
              sx={{
                height: 'calc(70vh + 120px)', // PDFビューアー全体コンテナと同じ高さ
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#888',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: '#555',
                  },
                },
              }}
            >
              {/* ブロック選択パネル */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    範囲ブロック選択
                  </Typography>
                  {mode === 'select' && !currentBlockType && (
                    <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                      範囲選択モードです。抽出したいブロックタイプを選択してください。
                    </Typography>
                  )}
                  {mode === 'select' && currentBlockType && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      💡 ヒント：文字が含まれる領域を十分な大きさで選択してください。
                    </Typography>
                  )}
                  {mode === 'move' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      移動モードです。PDFをパン・ズームできます。
                    </Typography>
                  )}
                  {documentData.template?.blocks?.map((block) => (
                    <Button
                      key={block.block_id}
                      variant={currentBlockType === block.block_id ? 'contained' : 'outlined'}
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={() => {
                        setCurrentBlockType(block.block_id);
                        // ブロックを選択したら自動的に範囲選択モードに切り替え
                        setMode('select');
                      }}
                    >
                      {block.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* 選択済みブロック一覧 */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    抽出結果
                  </Typography>
                  {selectedBlocks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      範囲を選択すると、ここに結果が表示されます
                    </Typography>
                  ) : (
                    selectedBlocks.map((block, index) => {
                      // console.log(`Rendering block ${index}:`, block);
                      // console.log(`Block isProcessing: ${block.isProcessing}, extractionResult:`, block.extractionResult);
                      const blockDef = documentData.template?.blocks?.find(b => b.block_id === block.blockId);
                      return (
                        <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" color="primary">
                                {blockDef?.label}
                              </Typography>
                              {block.extractionId && (
                                <Typography variant="caption" color="success.main" sx={{ 
                                  backgroundColor: 'success.light', 
                                  px: 1, 
                                  borderRadius: 1,
                                  fontSize: '0.7rem'
                                }}>
                                  保存済み
                                </Typography>
                              )}
                            </Box>
                            <Box>
                              {/* 手動OCRボタン（自動OCRがOFFまたは処理失敗時） */}
                              {(!autoOcr || (!block.extractionResult && !block.isProcessing)) && (
                                <Tooltip title="OCRを実行">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleManualOCR(block)}
                                    disabled={block.isProcessing}
                                  >
                                    <PlayArrowIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {/* 点検補正ボタン（JSON表示時のみ表示） */}
                              {(block.extractionResult && !block.extractionResult.error && !block.isProcessing && showJsonView[block.blockId]) && (
                                <Tooltip title="点検補正">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleEditOcrResult(block)}
                                    color={block.extractionId ? "primary" : "default"}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {/* JSON表示/非表示切り替えボタン（点検補正表示時のみ表示） */}
                              {(block.extractionResult && !block.extractionResult.error && !block.isProcessing && !showJsonView[block.blockId]) && (
                                <Tooltip title="JSON表示に切り替え">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => toggleJsonView(block.blockId)}
                                    color="default"
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {/* デバッグプレビューボタン */}
                              {(block.croppedImageUrl || block.rawResponse) && (
                                <Tooltip title="デバッグ情報を表示">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleDebugPreview(block)}
                                  >
                                    <BugReportIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {/* 削除ボタン */}
                              <Tooltip title="この選択を削除">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteBlock(block)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          
                          {(() => {
                            // console.log(`UI condition check - isProcessing: ${block.isProcessing}, extractionResult: ${!!block.extractionResult}`);
                            
                            if (block.isProcessing) {
                              // console.log('Rendering: OCR processing...');
                              return (
                                <Box display="flex" alignItems="center" gap={1}>
                                  <CircularProgress size={16} />
                                  <Typography variant="body2" color="text.secondary">
                                    OCR処理中...
                                  </Typography>
                                </Box>
                              );
                            } else if (block.extractionResult && !block.extractionResult.error) {
                              // console.log('Rendering OCR result - showJsonView:', showJsonView[block.blockId]);
                              
                              // JSON表示が有効な場合はJSONを表示、そうでなければデフォルトで編集フォームを表示
                              if (showJsonView[block.blockId]) {
                                return (
                                  <pre style={{ 
                                    fontSize: '12px', 
                                    overflow: 'auto', 
                                    maxHeight: '200px',
                                    backgroundColor: '#f5f5f5',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    margin: 0
                                  }}>
                                    {JSON.stringify(block.extractionResult, null, 2)}
                                  </pre>
                                );
                              } else {
                                // デフォルトで点検補正エディターを表示
                                const blockDef = documentData?.template?.blocks?.find(b => b.block_id === block.blockId);
                                if (blockDef) {
                                  return (
                                    <OcrResultEditor
                                      block={block}
                                      blockDefinition={blockDef}
                                      onSave={handleSaveOcrCorrection}
                                      onCancel={() => {}} // キャンセル機能は無効（常に編集モード）
                                    />
                                  );
                                } else {
                                  return (
                                    <Typography variant="body2" color="error">
                                      ブロック定義が見つかりません
                                    </Typography>
                                  );
                                }
                              }
                            } else if (block.extractionResult?.error) {
                              // console.log('Rendering: OCR error:', block.extractionResult.error);
                              return (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                  {block.extractionResult.error}
                                </Alert>
                              );
                            } else {
                              // console.log('Rendering: Waiting for OCR...');
                              return (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {autoOcr ? 'OCR実行待機中...' : 'OCRボタンを押してください'}
                                  </Typography>
                                  {!autoOcr && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      startIcon={<PlayArrowIcon />}
                                      onClick={() => handleManualOCR(block)}
                                      sx={{ mt: 1 }}
                                    >
                                      OCR実行
                                    </Button>
                                  )}
                                </Box>
                              );
                            }
                          })()}
                        </Box>
                      );
                    })
                  )}
                </CardContent>
              </Card>

            </Box>
          </Grid>
        </Grid>

        {/* 承認状況セクション（ページ下部、全幅） */}
        <Box sx={{ mt: 4 }}>
          <ApprovalSection documentId={documentData.id} />
        </Box>
      </Box>

      {/* デバッグプレビューダイアログ */}
      <Dialog 
        open={debugPreviewOpen} 
        onClose={() => setDebugPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          デバッグ情報 - {debugData?.blockLabel}
        </DialogTitle>
        <DialogContent>
          {debugData?.croppedImage && (
            <Box mb={2}>
              <Typography variant="h6" gutterBottom>
                OCR対象画像
              </Typography>
              <img 
                src={debugData.croppedImage} 
                alt="Cropped for OCR" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} 
              />
            </Box>
          )}
          
          {debugData?.rawResponse && (
            <Box>
              <Typography variant="h6" gutterBottom>
                API レスポンス（Raw）
              </Typography>
              <pre style={{ 
                fontSize: '12px', 
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                whiteSpace: 'pre-wrap'
              }}>
                {debugData.rawResponse}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDebugPreviewOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          抽出結果の削除確認
        </DialogTitle>
        <DialogContent>
          <Typography>
            この抽出結果を削除してもよろしいですか？
          </Typography>
          {blockToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ブロック: {document?.template?.blocks?.find(b => b.block_id === blockToDelete.blockId)?.label}
              </Typography>
              {blockToDelete.extractionResult && (
                <Typography variant="body2" color="text.secondary">
                  データ: {JSON.stringify(blockToDelete.extractionResult, null, 2).substring(0, 100)}...
                </Typography>
              )}
            </Box>
          )}
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            ⚠️ この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={confirmDeleteBlock} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentDetailPage;