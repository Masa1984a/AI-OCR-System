import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, CircularProgress, Typography, IconButton, TextField } from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { DrawingLayer } from './DrawingLayer';
import { api } from '../services/api';

interface PdfViewerProps {
  documentId: string | null;
  pageCount: number;
  currentPage: number;
  scale: number;
  mode: 'select' | 'move';
  onPageChange?: (pageNumber: number) => void;
  onSelectionComplete?: (selection: any) => void;
}

export default function PdfViewer({ 
  documentId, 
  pageCount,
  currentPage,
  scale = 1.0,
  mode,
  onPageChange,
  onSelectionComplete
}: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const pageRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // ページ画像を取得
  const fetchPageImage = useCallback(async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 既存の画像URLをクリーンアップ
      if (pageImageUrl) {
        URL.revokeObjectURL(pageImageUrl);
        setPageImageUrl(null);
      }

      const response = await api.get(`/api/v1/documents/${documentId}/pages/${currentPage}`, {
        responseType: 'blob'
      });
      
      // Blob URLを作成
      const blob = new Blob([response.data], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      
      setPageImageUrl(imageUrl);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch page image:', err);
      setError('ページ画像の取得に失敗しました');
      setLoading(false);
    }
  }, [documentId, currentPage]);

  // ページまたはドキュメントが変更されたときに画像を取得
  useEffect(() => {
    fetchPageImage();
  }, [fetchPageImage]);

  // 画像ロード時のサイズ取得
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    setPageSize({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // スケール変更時に位置をリセット
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [scale]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (pageImageUrl) {
        URL.revokeObjectURL(pageImageUrl);
      }
    };
  }, [pageImageUrl]);


  const changePage = (offset: number) => {
    const newPage = currentPage + offset;
    if (newPage >= 1 && newPage <= pageCount) {
      onPageChange?.(newPage);
    }
  };

  const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (value >= 1 && value <= pageCount) {
      onPageChange?.(value);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'move') {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && mode === 'move') {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (!documentId) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'text.secondary',
        }}
      >
        <Typography>ドキュメントが選択されていません</Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        height: '100%',
        overflow: 'hidden',
        cursor: mode === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>画像を読み込み中...</Typography>
        </Box>
      ) : error ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
          }}
        >
          <Typography color="error">{error}</Typography>
        </Box>
      ) : pageImageUrl ? (
        <Box 
          ref={pageRef} 
          sx={{ 
            position: 'relative', 
            display: 'inline-block',
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s',
          }}>
          <img
            src={pageImageUrl}
            alt={`Page ${currentPage}`}
            style={{
              display: 'block',
              width: `${pageSize.width * scale}px`,
              height: `${pageSize.height * scale}px`,
              maxWidth: 'none',
            }}
            onLoad={handleImageLoad}
            onError={() => setError('画像の読み込みに失敗しました')}
          />
          
          {pageSize.width > 0 && pageSize.height > 0 && (
            <Box sx={{ position: 'absolute', top: 0, left: 0 }}>
              <DrawingLayer
                width={pageSize.width * scale}
                height={pageSize.height * scale}
                mode={mode}
                onSelectionComplete={onSelectionComplete || (() => {})}
              />
            </Box>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
          }}
        >
          <Typography color="text.secondary">画像が利用できません</Typography>
        </Box>
      )}

      {pageCount > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '4px 8px',
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={() => changePage(-1)}
            disabled={currentPage <= 1}
          >
            <NavigateBefore />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              size="small"
              type="number"
              value={currentPage}
              onChange={handlePageInputChange}
              inputProps={{
                min: 1,
                max: pageCount,
                style: { width: '3em', textAlign: 'center' }
              }}
              variant="standard"
            />
            <Typography variant="body2">/ {pageCount}</Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => changePage(1)}
            disabled={currentPage >= pageCount}
          >
            <NavigateNext />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}