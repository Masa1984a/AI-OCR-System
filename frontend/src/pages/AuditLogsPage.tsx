import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Snackbar,
  Alert as MUIAlert,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import {
  Refresh,
  Search,
  Download,
  FilterList,
  Visibility,
  Computer,
  Person,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { auditLogsApi } from '../services/api';
import { 
  AuditLog, 
  AuditLogsResult, 
  AuditLogsSummary, 
  AuditLogsQueryParams, 
  AuditOperation,
  TableOption,
  OperationOption 
} from '../types/audit-log.types';
import { UserRole } from '../types/user.types';

const AuditLogsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AuditLogsSummary | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState<AuditOperation | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Options
  const [tables, setTables] = useState<TableOption[]>([]);
  const [operations, setOperations] = useState<OperationOption[]>([]);
  
  // Dialog state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: AuditLogsQueryParams = {
        page: page + 1, // Backend expects 1-based pagination
        limit: pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(userIdFilter && { userId: userIdFilter }),
        ...(tableFilter && { tableName: tableFilter }),
        ...(operationFilter && { operation: operationFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const response = await auditLogsApi.list(params);
      const data: AuditLogsResult = response.data;
      
      setAuditLogs(data.auditLogs);
      setTotalLogs(data.total);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError('監査ログの取得に失敗しました');
      setSnackbar({
        open: true,
        message: '監査ログの取得に失敗しました',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, userIdFilter, tableFilter, operationFilter, startDate, endDate]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await auditLogsApi.getSummary();
      setSummary(response.data);
    } catch (err: any) {
      console.error('Failed to fetch summary:', err);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [tablesResponse, operationsResponse] = await Promise.all([
        auditLogsApi.getTables(),
        auditLogsApi.getOperations(),
      ]);
      
      setTables(tablesResponse.data);
      setOperations(operationsResponse.data);
    } catch (err: any) {
      console.error('Failed to fetch options:', err);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    fetchSummary();
    fetchOptions();
  }, [fetchSummary, fetchOptions]);

  const handleRefresh = () => {
    fetchAuditLogs();
    fetchSummary();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleExportCsv = async () => {
    try {
      const params = {
        ...(searchQuery && { search: searchQuery }),
        ...(userIdFilter && { userId: userIdFilter }),
        ...(tableFilter && { tableName: tableFilter }),
        ...(operationFilter && { operation: operationFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const response = await auditLogsApi.exportCsv(params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: '監査ログをCSVでエクスポートしました',
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      setSnackbar({
        open: true,
        message: 'CSVエクスポートに失敗しました',
        severity: 'error',
      });
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const getOperationChip = (operation: AuditOperation) => {
    const colors = {
      [AuditOperation.INSERT]: 'success',
      [AuditOperation.UPDATE]: 'warning',
      [AuditOperation.DELETE]: 'error',
      [AuditOperation.SELECT]: 'info',
    } as const;

    const labels = {
      [AuditOperation.INSERT]: '作成',
      [AuditOperation.UPDATE]: '更新',
      [AuditOperation.DELETE]: '削除',
      [AuditOperation.SELECT]: '参照',
    };

    return (
      <Chip
        label={labels[operation]}
        color={colors[operation]}
        size="small"
      />
    );
  };

  const formatJsonValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const columns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: '日時',
      width: 160,
      sortable: false,
      renderCell: (params) => new Date(params.value).toLocaleString('ja-JP'),
    },
    {
      field: 'user',
      headerName: 'ユーザー',
      width: 150,
      sortable: false,
      renderCell: (params) => params.row.user?.username || 'システム',
    },
    {
      field: 'operation',
      headerName: '操作',
      width: 80,
      sortable: false,
      renderCell: (params) => getOperationChip(params.value),
    },
    {
      field: 'tableName',
      headerName: 'テーブル',
      width: 120,
      sortable: false,
    },
    {
      field: 'recordId',
      headerName: 'レコードID',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {params.value}
        </span>
      ),
    },
    {
      field: 'ipAddress',
      headerName: 'IPアドレス',
      width: 130,
      sortable: false,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={() => handleViewDetails(params.row)}
        >
          <Visibility />
        </IconButton>
      ),
    },
  ];

  const rows: GridRowsProp = auditLogs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    user: log.user,
    operation: log.operation,
    tableName: log.tableName,
    recordId: log.recordId,
    ipAddress: log.ipAddress,
    ...log,
  }));

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          この機能は管理者のみ利用できます。
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          監査ログ
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            更新
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCsv}
            disabled={loading}
          >
            CSVエクスポート
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="primary" />
                  <Box>
                    <Typography variant="h6">{summary.totalLogs.toLocaleString()}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      総ログ数
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="secondary" />
                  <Box>
                    <Typography variant="h6">{summary.totalUsers}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      ユーザー数
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Computer color="success" />
                  <Box>
                    <Typography variant="h6">{summary.totalTables}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      対象テーブル
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule color="warning" />
                  <Box>
                    <Typography variant="h6">{summary.todayLogs}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      今日のログ
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            フィルター
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="検索"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="ユーザー名、テーブル名、操作で検索"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>テーブル</InputLabel>
                <Select
                  value={tableFilter}
                  label="テーブル"
                  onChange={(e) => setTableFilter(e.target.value)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {tables.map((table) => (
                    <MenuItem key={table.value} value={table.value}>
                      {table.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>操作</InputLabel>
                <Select
                  value={operationFilter}
                  label="操作"
                  onChange={(e) => setOperationFilter(e.target.value as AuditOperation | '')}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {operations.map((operation) => (
                    <MenuItem key={operation.value} value={operation.value}>
                      {operation.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="開始日"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="終了日"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          paginationMode="server"
          rowCount={totalLogs}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowsPerPageOptions={[10, 25, 50, 100]}
          loading={loading}
          disableRowSelectionOnClick
          disableColumnMenu
          sx={{
            '& .MuiDataGrid-cell': {
              alignItems: 'center',
            },
          }}
        />
      </Paper>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          監査ログ詳細
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    基本情報
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2"><strong>日時:</strong> {new Date(selectedLog.createdAt).toLocaleString('ja-JP')}</Typography>
                    <Typography variant="body2"><strong>ユーザー:</strong> {selectedLog.user?.username || 'システム'}</Typography>
                    <Typography variant="body2"><strong>メール:</strong> {selectedLog.user?.email || '-'}</Typography>
                    <Typography variant="body2"><strong>操作:</strong> {getOperationChip(selectedLog.operation)}</Typography>
                    <Typography variant="body2"><strong>テーブル:</strong> {selectedLog.tableName}</Typography>
                    <Typography variant="body2"><strong>レコードID:</strong> {selectedLog.recordId}</Typography>
                    <Typography variant="body2"><strong>IPアドレス:</strong> {selectedLog.ipAddress || '-'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    技術情報
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      <strong>ユーザーエージェント:</strong> {selectedLog.userAgent || '-'}
                    </Typography>
                  </Box>
                </Grid>
                
                {selectedLog.oldValues && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      変更前の値
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                        {formatJsonValue(selectedLog.oldValues)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                
                {selectedLog.newValues && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      変更後の値
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                        {formatJsonValue(selectedLog.newValues)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <MUIAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MUIAlert>
      </Snackbar>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
};

export default AuditLogsPage;