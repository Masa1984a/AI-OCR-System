import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, CircularProgress, Typography, IconButton, TextField } from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { DrawingLayer } from './DrawingLayer';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDF.js workerの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  file: string | File | null;
  scale: number;
  mode: 'select' | 'move';
  onLoadSuccess?: (numPages: number) => void;
  onPageChange?: (pageNumber: number) => void;
  onSelectionComplete?: (selection: any) => void;
}

export default function PdfViewer({ 
  file, 
  scale = 1.0,
  mode,
  onLoadSuccess,
  onPageChange,
  onSelectionComplete
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const pageRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    onLoadSuccess?.(numPages);
  }, [onLoadSuccess]);

  const handlePageLoadSuccess = useCallback(() => {
    // ページサイズを取得
    if (pageRef.current) {
      const canvas = pageRef.current.querySelector('canvas');
      if (canvas) {
        setPageSize({
          width: canvas.width / window.devicePixelRatio,
          height: canvas.height / window.devicePixelRatio,
        });
      }
    }
  }, []);

  // スケールが変更されたときにページサイズを再計算
  useEffect(() => {
    if (pageRef.current) {
      const canvas = pageRef.current.querySelector('canvas');
      if (canvas) {
        setPageSize({
          width: canvas.width / window.devicePixelRatio,
          height: canvas.height / window.devicePixelRatio,
        });
      }
    }
    // スケール変更時に位置をリセット
    setPosition({ x: 0, y: 0 });
  }, [scale]);


  const changePage = (offset: number) => {
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= (numPages || 1)) {
      setPageNumber(newPage);
      onPageChange?.(newPage);
    }
  };

  const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (value >= 1 && value <= (numPages || 1)) {
      setPageNumber(value);
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

  if (!file) {
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
        <Typography>PDFファイルを選択してください</Typography>
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

      <Box 
        ref={pageRef} 
        sx={{ 
          position: 'relative', 
          display: 'inline-block',
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s',
        }}>
        <Document
          file={file}
          onLoadSuccess={handleLoadSuccess}
          loading=""
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            onLoadSuccess={handlePageLoadSuccess}
          />
        </Document>
        
        {pageSize.width > 0 && pageSize.height > 0 && (
          <Box sx={{ position: 'absolute', top: 0, left: 0 }}>
            <DrawingLayer
              width={pageSize.width}
              height={pageSize.height}
              mode={mode}
              onSelectionComplete={onSelectionComplete || (() => {})}
            />
          </Box>
        )}
      </Box>

      {numPages && numPages > 1 && (
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
            disabled={pageNumber <= 1}
          >
            <NavigateBefore />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              size="small"
              type="number"
              value={pageNumber}
              onChange={handlePageInputChange}
              inputProps={{
                min: 1,
                max: numPages,
                style: { width: '3em', textAlign: 'center' }
              }}
              variant="standard"
            />
            <Typography variant="body2">/ {numPages}</Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
          >
            <NavigateNext />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}